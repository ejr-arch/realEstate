/* ════════════════════════════════════════════════════════════
   PropVista — Supabase Client Config
   db.js  —  include BEFORE app.js and chat.js in index.html
════════════════════════════════════════════════════════════ */

// ── FILL IN YOUR SUPABASE PROJECT DETAILS ────────────────────
//  Dashboard → Settings → API
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
// ─────────────────────────────────────────────────────────────

/* Load Supabase JS from CDN (added dynamically so this file is self-contained) */
(function loadSupabase() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    window._db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      realtime: { params: { eventsPerSecond: 20 } }
    });
    window.dispatchEvent(new Event('db:ready'));
  };
  document.head.appendChild(script);
})();

/* ── Auth helpers ────────────────────────────────────────────── */

/** Sign in with email + password. Returns { user, profile } or throws. */
async function dbSignIn(email, password) {
  const { data, error } = await window._db.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const profile = await dbGetProfile(data.user.id);
  await dbSetOnline(data.user.id, true);
  return { user: data.user, profile };
}

/** Sign out */
async function dbSignOut() {
  const uid = (await window._db.auth.getUser()).data?.user?.id;
  if (uid) await dbSetOnline(uid, false);
  await window._db.auth.signOut();
}

/** Fetch a profile row */
async function dbGetProfile(uid) {
  const { data, error } = await window._db
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return data;
}

/** Set online status */
async function dbSetOnline(uid, online) {
  await window._db.from('profiles')
    .update({ online, last_seen: new Date().toISOString() })
    .eq('id', uid);
}

/* ── Message helpers ─────────────────────────────────────────── */

/** Fetch message history between two users */
async function dbGetMessages(uid1, uid2, limit = 80) {
  const { data, error } = await window._db
    .from('messages')
    .select('*, from:from_id(id,name,role,avatar_char), to:to_id(id,name,role,avatar_char)')
    .or(`and(from_id.eq.${uid1},to_id.eq.${uid2}),and(from_id.eq.${uid2},to_id.eq.${uid1})`)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Send a message */
async function dbSendMessage(fromId, toId, content, type = 'text', metadata = null) {
  const { data, error } = await window._db
    .from('messages')
    .insert({ from_id: fromId, to_id: toId, content, type, metadata })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Mark all messages from a sender as read */
async function dbMarkRead(fromId, toId) {
  await window._db
    .from('messages')
    .update({ read: true })
    .eq('from_id', fromId)
    .eq('to_id', toId)
    .eq('read', false);
}

/** Get all conversation partners for admin */
async function dbGetConversations(adminId) {
  const { data, error } = await window._db
    .rpc('get_conversations', { admin_uid: adminId });
  if (error) throw error;
  return data || [];
}

/** Get all non-admin profiles (for admin to pick who to chat with) */
async function dbGetUsers() {
  const { data, error } = await window._db
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Count unread messages for current user */
async function dbUnreadCount(toId) {
  const { count, error } = await window._db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('to_id', toId)
    .eq('read', false);
  if (error) return 0;
  return count || 0;
}

/** Subscribe to new messages in real-time.
 *  Returns the channel so caller can unsubscribe. */
function dbSubscribeMessages(myId, onMessage) {
  const channel = window._db
    .channel(`messages:${myId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `to_id=eq.${myId}`
      },
      payload => onMessage(payload.new)
    )
    .subscribe();
  return channel;
}

/** Subscribe to profile online status changes */
function dbSubscribePresence(onUpdate) {
  return window._db
    .channel('profiles:presence')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles' },
      payload => onUpdate(payload.new)
    )
    .subscribe();
}
