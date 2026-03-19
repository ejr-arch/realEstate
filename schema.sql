-- ════════════════════════════════════════════════════════════
--  PropVista — Supabase Schema
--  Paste this entire file into your Supabase SQL Editor and Run
-- ════════════════════════════════════════════════════════════

-- ── 1. PROFILES (extends auth.users) ─────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  name        text        not null default 'User',
  role        text        not null default 'user'  check (role in ('admin','user')),
  avatar_char text        not null default 'U',
  online      boolean     not null default false,
  last_seen   timestamptz default now(),
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone can read profiles (needed for chat participant names)
create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 2. MESSAGES ───────────────────────────────────────────────
create table if not exists public.messages (
  id           uuid        primary key default gen_random_uuid(),
  from_id      uuid        not null references public.profiles(id) on delete cascade,
  to_id        uuid        not null references public.profiles(id) on delete cascade,
  content      text,
  type         text        not null default 'text'
                           check (type in ('text','image','location','property','system')),
  metadata     jsonb,          -- for image urls, property data, coords
  read         boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Users can see messages they sent or received
create policy "Users see their own messages"
  on public.messages for select
  using (
    auth.uid() = from_id or
    auth.uid() = to_id
  );

-- Admins can see ALL messages
create policy "Admins see all messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Any authenticated user can insert messages
create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = from_id);

-- Users can mark their received messages as read
create policy "Users can mark received messages read"
  on public.messages for update
  using (auth.uid() = to_id)
  with check (auth.uid() = to_id);

-- ── 3. REALTIME — enable on messages ─────────────────────────
-- In Supabase dashboard: Database → Replication → enable for public.messages
-- This SQL enables it programmatically:
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.messages, public.profiles;
commit;

-- ── 4. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, role, avatar_char)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 5. FUNCTION — get conversations for admin ─────────────────
-- Returns the latest message per unique conversation partner
create or replace function public.get_conversations(admin_uid uuid)
returns table (
  partner_id    uuid,
  partner_name  text,
  partner_email text,
  partner_char  text,
  last_message  text,
  last_type     text,
  last_time     timestamptz,
  unread_count  bigint
) language sql security definer as $$
  select
    p.id                                         as partner_id,
    p.name                                       as partner_name,
    p.email                                      as partner_email,
    p.avatar_char                                as partner_char,
    m.content                                    as last_message,
    m.type                                       as last_type,
    m.created_at                                 as last_time,
    count(*) filter (where m2.read = false and m2.to_id = admin_uid) as unread_count
  from public.profiles p
  join lateral (
    select * from public.messages
    where (from_id = p.id and to_id = admin_uid)
       or (from_id = admin_uid and to_id = p.id)
    order by created_at desc
    limit 1
  ) m on true
  left join public.messages m2
    on (m2.from_id = p.id and m2.to_id = admin_uid)
  where p.role = 'user'
  group by p.id, p.name, p.email, p.avatar_char, m.content, m.type, m.created_at
  order by m.created_at desc;
$$;

-- ── 6. SEED — create admin account ───────────────────────────
-- After running this schema, create your admin via Supabase Auth dashboard:
--   Authentication → Users → Invite user  (email: admin@propvista.ug, set password)
-- Then run this to promote them to admin:
--
--   update public.profiles
--   set role = 'admin', name = 'PropVista Admin', avatar_char = 'A'
--   where email = 'admin@propvista.ug';
--
-- Regular users can self-register via the app signup or you can invite them.

-- ════════════════════════════════════════════════════════════
--  DONE. Next steps:
--  1. In Supabase dashboard → Authentication → Settings:
--     - Enable "Email" provider
--     - Disable "Confirm email" for easier dev (or set up SMTP)
--  2. In Database → Replication → enable realtime for messages & profiles tables
--  3. Create admin user in Auth → Users, then run the UPDATE above
-- ════════════════════════════════════════════════════════════
