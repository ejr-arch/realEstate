# PropVista — Database & Live Chat Setup Guide

## What was added
- **Supabase** as the backend (free tier works perfectly)
- Real-time live chat between Admin ↔ Users (not AI — actual people)
- Persistent message history
- Online/offline presence indicators
- Read receipts (double ticks)
- Credentials-only login + user registration
- Image sharing, location sharing, property card sharing in chat

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Set a name (e.g. `propvista`) and a strong database password
3. Choose a region close to Uganda (e.g. `eu-west-1` or `us-east-1`)
4. Wait ~2 minutes for the project to spin up

---

## Step 2 — Run the schema

1. In your Supabase dashboard → **SQL Editor** → **New Query**
2. Paste the entire contents of `schema.sql`
3. Click **Run**
4. You should see: `Success. No rows returned`

---

## Step 3 — Enable Realtime

1. Supabase dashboard → **Database** → **Replication**
2. Under "Tables", find `messages` and `profiles`
3. Toggle **Realtime** ON for both

---

## Step 4 — Create the Admin account

1. Supabase dashboard → **Authentication** → **Users** → **Add user**
2. Enter email: `admin@propvista.ug` (or whatever you prefer)
3. Enter a secure password
4. Click **Create**
5. Then go to **SQL Editor** and run:

```sql
UPDATE public.profiles
SET role = 'admin', name = 'PropVista Admin', avatar_char = 'A'
WHERE email = 'admin@propvista.ug';
```

---

## Step 5 — Configure `db.js`

Open `db.js` and fill in your project details:

```js
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
```

Find these at: **Settings** → **API** in your Supabase dashboard.
Use the **anon / public** key (not the service_role key).

---

## Step 6 — (Optional) Image uploads

To support image sharing in chat:

1. Supabase dashboard → **Storage** → **New Bucket**
2. Name it `chat-images`, set it to **Public**
3. Under **Policies**, add a policy: authenticated users can INSERT and SELECT

---

## Step 7 — Disable email confirmation (for easier dev)

1. Supabase → **Authentication** → **Settings**
2. Under **Email** → disable **"Enable email confirmations"**
3. This lets users register and log in immediately without verifying email

---

## File structure (all files needed)

```
propvista/
├── index.html      ← updated (no demo buttons, tabs, Supabase auth)
├── style.css       ← unchanged
├── db.js           ← NEW — Supabase client + all DB helpers
├── chat.js         ← NEW — Real live chat (replaces demo chat)
├── app.js          ← your existing app.js
├── data.js         ← your existing property data
├── schema.sql      ← run once in Supabase SQL editor
└── assets/
    └── bg/
        ├── bg1.png
        └── a2.mp3
```

---

## How the chat works

### Admin view
- Opens chat → sees **inbox** with all users who have messaged
- Shows last message preview + unread count per user
- Click any user → opens that conversation
- Back button → returns to inbox

### User view
- Opens chat → goes directly to conversation with Admin
- Messages are delivered in real-time via Supabase Realtime
- Read receipts show when admin has read the message

### Message types supported
- ✉️ Text
- 📷 Images (uploaded to Supabase Storage)
- 📍 Location (with embedded OpenStreetMap preview)
- 🏠 Property cards (click to open property detail)

---

## Credentials for testing

After setup, create users via the **Sign In → Create Account** tab in the app,
or directly in Supabase Auth dashboard.

Admin login is the account you created in Step 4.
