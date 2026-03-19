/* ════════════════════════════════════════════════════════════
   PropVista — Live Chat  (chat.js)
   Real-time messaging via Supabase Realtime
   Admin  → sees inbox of all user conversations
   User   → private chat with admin
════════════════════════════════════════════════════════════ */

let chatOpen         = false;
let currentChatWith  = null;
let chatChannel      = null;
let presenceChannel  = null;
let unreadTotal      = 0;
let adminId          = null;
let emojiPickerBuilt = false;

/* ── Wait for DB then watch auth state ─────────────────────── */
window.addEventListener('db:ready', () => {
  window._db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) bootstrapChat();
    if (event === 'SIGNED_OUT') teardownChat();
  });
});

async function bootstrapChat() {
  try {
    const { data: { user } } = await window._db.auth.getUser();
    if (!user) return;

    const profile = await dbGetProfile(user.id);
    window.currentUser = profile;

    if (profile.role !== 'admin') {
      const { data } = await window._db
        .from('profiles').select('id').eq('role','admin').limit(1).single();
      adminId = data?.id || null;
    }

    if (chatChannel) chatChannel.unsubscribe();
    chatChannel = dbSubscribeMessages(profile.id, onIncomingMessage);

    if (presenceChannel) presenceChannel.unsubscribe();
    presenceChannel = dbSubscribePresence(onPresenceUpdate);

    const count = await dbUnreadCount(profile.id);
    setUnreadBadge(count);
  } catch (err) {
    console.error('Chat bootstrap error:', err);
  }
}

function teardownChat() {
  chatChannel?.unsubscribe(); chatChannel = null;
  presenceChannel?.unsubscribe(); presenceChannel = null;
  currentChatWith = null;
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
}

/* ══════════════════════════════════════════════════════════════
   TOGGLE / OPEN CHAT
══════════════════════════════════════════════════════════════ */
async function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chat-panel');
  if (!panel) return;

  if (chatOpen) {
    panel.classList.remove('collapsed');
    setUnreadBadge(0);
    const profile = window.currentUser;
    if (!profile) return;
    if (profile.role === 'admin') {
      await showAdminInbox();
    } else {
      if (adminId) {
        const adminProfile = await dbGetProfile(adminId);
        await openConversation(adminProfile);
      } else {
        showNoChatPlaceholder();
      }
    }
  } else {
    panel.classList.add('collapsed');
  }
}

/* ══════════════════════════════════════════════════════════════
   ADMIN INBOX
══════════════════════════════════════════════════════════════ */
async function showAdminInbox() {
  showView('chat-user-selector');
  const listEl = document.getElementById('admin-chat-list');
  listEl.innerHTML = `<div class="chat-loading"><div class="spinner"></div><span>Loading…</span></div>`;

  try {
    const me = window.currentUser;
    const convos = await dbGetConversations(me.id);
    renderAdminInbox(convos, listEl);
  } catch (err) {
    listEl.innerHTML = `<div class="chat-error">Failed to load: ${err.message}</div>`;
  }
}

function renderAdminInbox(convos, container) {
  if (!convos.length) {
    container.innerHTML = `
      <div class="empty-chat-state">
        <i class="fa-regular fa-comments"></i>
        <p>No conversations yet</p>
        <span>Users will appear here when they message you</span>
      </div>`;
    return;
  }
  container.innerHTML = convos.map(c => `
    <div class="chat-user-item" data-uid="${c.partner_id}" onclick="openConversationById('${c.partner_id}')">
      <div class="cui-avatar" style="background:linear-gradient(135deg,
        hsl(${strToHue(c.partner_email)},50%,44%),
        hsl(${strToHue(c.partner_email)},50%,28%));">
        ${escHtml(c.partner_char || (c.partner_name||'U').charAt(0).toUpperCase())}
      </div>
      <div class="cui-info">
        <div class="cui-name">${escHtml(c.partner_name)}</div>
        <div class="cui-preview">${formatPreview(c.last_message, c.last_type)}</div>
      </div>
      <div class="cui-meta">
        <div class="cui-time">${timeAgo(c.last_time)}</div>
        ${c.unread_count > 0 ? `<div class="cui-badge">${c.unread_count}</div>` : ''}
      </div>
    </div>`).join('');
}

async function showAdminChatList() { await showAdminInbox(); }

async function openConversationById(partnerId) {
  try {
    const profile = await dbGetProfile(partnerId);
    await openConversation(profile);
  } catch (e) { console.error(e); }
}

/* ══════════════════════════════════════════════════════════════
   OPEN A CONVERSATION
══════════════════════════════════════════════════════════════ */
async function openConversation(partnerProfile) {
  currentChatWith = partnerProfile;
  const me = window.currentUser;
  showView('chat-convo');

  const avatarEl = document.getElementById('chat-avatar-display');
  const hue = strToHue(partnerProfile.email);
  avatarEl.textContent = partnerProfile.avatar_char || partnerProfile.name.charAt(0).toUpperCase();
  avatarEl.style.cssText = `background:linear-gradient(135deg,hsl(${hue},50%,44%),hsl(${hue},50%,28%));color:#fff;font-weight:700;`;

  document.getElementById('chat-with-name').textContent = partnerProfile.name;
  const statusEl = document.getElementById('chat-status');
  updateStatusIndicator(statusEl, partnerProfile.online, partnerProfile.last_seen);

  const backBtn = document.getElementById('back-to-list-btn');
  if (backBtn) backBtn.style.display = me.role === 'admin' ? 'flex' : 'none';

  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = `<div class="chat-loading"><div class="spinner"></div><span>Loading messages…</span></div>`;

  try {
    const history = await dbGetMessages(me.id, partnerProfile.id);
    msgs.innerHTML = '';
    if (!history.length) {
      showWelcomeBubble(me, partnerProfile);
    } else {
      let lastDate = null;
      for (const msg of history) {
        const d = new Date(msg.created_at).toDateString();
        if (d !== lastDate) { appendDateDivider(msgs, msg.created_at); lastDate = d; }
        appendMessageBubble(msgs, msg, me.id);
      }
    }
    msgs.scrollTop = msgs.scrollHeight;
    await dbMarkRead(partnerProfile.id, me.id);
  } catch (err) {
    msgs.innerHTML = `<div class="chat-error">Failed to load messages: ${err.message}</div>`;
  }
}

/* ══════════════════════════════════════════════════════════════
   SEND TEXT MESSAGE
══════════════════════════════════════════════════════════════ */
async function sendTextMessage() {
  const me = window.currentUser;
  const toProfile = me.role === 'admin' ? currentChatWith : await getAdminProfile();
  if (!toProfile) { showToast('No recipient available', 'error'); return; }

  const textarea = document.getElementById('chat-textarea');
  const text = textarea.value.trim();
  if (!text) return;

  textarea.value = '';
  textarea.style.height = 'auto';

  // Optimistic render
  const msgs = document.getElementById('chat-messages');
  const temp = appendMessageBubble(msgs, {
    id: 'tmp', from_id: me.id, to_id: toProfile.id,
    content: text, type: 'text', created_at: new Date().toISOString()
  }, me.id);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    await dbSendMessage(me.id, toProfile.id, text, 'text');
    temp?.remove();
  } catch (err) {
    showToast('Failed to send', 'error');
    console.error(err);
  }
}

/* ── Incoming realtime message ──────────────────────────────── */
async function onIncomingMessage(msg) {
  const me = window.currentUser;
  if (currentChatWith && msg.from_id === currentChatWith.id && chatOpen) {
    const msgs = document.getElementById('chat-messages');
    appendMessageBubble(msgs, msg, me.id);
    msgs.scrollTop = msgs.scrollHeight;
    await dbMarkRead(msg.from_id, me.id);
  } else {
    const cur = parseInt(document.getElementById('chat-badge')?.textContent || '0');
    setUnreadBadge(cur + 1);
    if (me.role === 'admin' && chatOpen) await showAdminInbox();
    playNotificationSound();
  }
}

/* ── Presence update ────────────────────────────────────────── */
function onPresenceUpdate(profile) {
  if (currentChatWith && profile.id === currentChatWith.id) {
    currentChatWith = { ...currentChatWith, ...profile };
    const statusEl = document.getElementById('chat-status');
    if (statusEl) updateStatusIndicator(statusEl, profile.online, profile.last_seen);
  }
}

/* ══════════════════════════════════════════════════════════════
   RENDER HELPERS
══════════════════════════════════════════════════════════════ */
function appendMessageBubble(container, msg, myId) {
  const isSent = msg.from_id === myId;

  if (msg.type === 'system') {
    const d = document.createElement('div');
    d.className = 'chat-system-msg';
    d.textContent = msg.content;
    container.appendChild(d);
    return d;
  }

  const row = document.createElement('div');
  row.className = `msg-row ${isSent ? 'sent' : 'recv'}`;
  row.dataset.msgId = msg.id;

  let inner = '';
  if (msg.type === 'text') {
    inner = `<div class="msg-bubble">${escHtml(msg.content)}</div>`;
  } else if (msg.type === 'image' && msg.metadata?.url) {
    inner = `<div class="msg-img" onclick="openLightbox('${escHtml(msg.metadata.url)}')">
      <img src="${escHtml(msg.metadata.url)}" alt="Image" loading="lazy"/></div>`;
  } else if (msg.type === 'location' && msg.metadata) {
    const { lat, lng, label } = msg.metadata;
    inner = `<div class="msg-location" onclick="window.open('https://maps.google.com/?q=${lat},${lng}','_blank')">
      <div class="loc-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-.005},${lat-.005},${lng+.005},${lat+.005}&layer=mapnik&marker=${lat},${lng}"
          style="width:100%;height:100%;border:none;pointer-events:none;" loading="lazy"></iframe>
      </div>
      <div class="loc-footer">
        <i class="fa-solid fa-location-dot"></i>
        <span>${escHtml(label||'Shared Location')}</span>
        <span class="loc-open">Open ↗</span>
      </div></div>`;
  } else if (msg.type === 'property' && msg.metadata) {
    const p = msg.metadata;
    inner = `<div class="msg-property-card" onclick="openPropModalById(${p.id})">
      ${p.image ? `<div class="mpc-img" style="background-image:url('${escHtml(p.image)}')"></div>` : ''}
      <div class="mpc-body">
        <div class="mpc-price">${escHtml(p.price||'')}</div>
        <div class="mpc-name">${escHtml(p.name||'')}</div>
        <div class="mpc-addr"><i class="fa-solid fa-location-dot"></i> ${escHtml(p.address||'')}</div>
      </div></div>`;
  }

  const time = new Date(msg.created_at).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'});
  const ticks = isSent
    ? `<span class="msg-ticks ${msg.read?'read':''}"><i class="fa-solid fa-check"></i><i class="fa-solid fa-check"></i></span>`
    : '';

  row.innerHTML = `<div class="msg-content">${inner}<div class="msg-time">${time} ${ticks}</div></div>`;
  container.appendChild(row);
  return row;
}

function appendDateDivider(container, dateStr) {
  const d = document.createElement('div');
  d.className = 'chat-date-divider';
  d.textContent = formatDateLabel(dateStr);
  container.appendChild(d);
}

function showWelcomeBubble(me, partner) {
  const msgs = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.className = 'chat-system-msg';
  d.innerHTML = me.role === 'admin'
    ? `Start of your conversation with <strong>${escHtml(partner.name)}</strong>`
    : `👋 Connected to <strong>PropVista Admin</strong>. Ask anything about our properties!`;
  msgs.appendChild(d);
}

function showNoChatPlaceholder() {
  showView('chat-convo');
  document.getElementById('chat-messages').innerHTML = `
    <div class="empty-chat-state">
      <i class="fa-solid fa-circle-exclamation"></i>
      <p>Admin unavailable</p><span>No admin account found.</span>
    </div>`;
}

function updateStatusIndicator(el, online, lastSeen) {
  el.innerHTML = online
    ? `<span class="online-dot active"></span> Online now`
    : `<span class="online-dot"></span> Last seen ${timeAgo(lastSeen)}`;
}

/* ══════════════════════════════════════════════════════════════
   SHARE LOCATION
══════════════════════════════════════════════════════════════ */
function shareLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported','error'); return; }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    const me = window.currentUser;
    const to = me.role === 'admin' ? currentChatWith : await getAdminProfile();
    if (!to) return;
    try {
      const msg = await dbSendMessage(me.id, to.id, '📍 Location', 'location', {lat, lng, label:'My Location'});
      const msgs = document.getElementById('chat-messages');
      appendMessageBubble(msgs, {...msg, from_id: me.id}, me.id);
      msgs.scrollTop = msgs.scrollHeight;
    } catch(e) { showToast('Failed to share location','error'); }
  }, () => showToast('Location access denied','error'));
}

/* ══════════════════════════════════════════════════════════════
   SHARE PROPERTY
══════════════════════════════════════════════════════════════ */
function openSharePropertyPicker() {
  const list  = document.getElementById('share-prop-list');
  const modal = document.getElementById('share-prop-modal');
  if (!list || !modal) return;
  list.innerHTML = (window.PROPERTIES||[]).map((p,i) => `
    <div onclick="sharePropertyInChat(${i})" class="spl-item">
      <div class="spl-name">${escHtml(p.name)}</div>
      <div class="spl-sub">${formatPrice(p.price)} · ${p.status||''}</div>
    </div>`).join('');
  modal.classList.add('open');
  modal.style.cssText = 'display:flex;opacity:1;pointer-events:all;';
}

async function sharePropertyInChat(index) {
  closeShareModal();
  const p = (window.PROPERTIES||[])[index];
  if (!p) return;
  const me = window.currentUser;
  const to = me.role === 'admin' ? currentChatWith : await getAdminProfile();
  if (!to) return;
  try {
    const msg = await dbSendMessage(me.id, to.id, `🏠 ${p.name}`, 'property', {
      id: index, name: p.name, price: formatPrice(p.price),
      address: p.address || p.location || '', image: p.image || ''
    });
    const msgs = document.getElementById('chat-messages');
    appendMessageBubble(msgs, {...msg, from_id: me.id}, me.id);
    msgs.scrollTop = msgs.scrollHeight;
  } catch(e) { showToast('Failed to share property','error'); }
}

function closeShareModal(e) {
  if (e && e.target !== document.getElementById('share-prop-modal')) return;
  const modal = document.getElementById('share-prop-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.style.opacity = '0'; modal.style.pointerEvents = 'none';
  setTimeout(() => modal.style.display = 'none', 300);
}

/* ══════════════════════════════════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════════════════════════════════ */
function handleImageUpload(input) {
  Array.from(input.files).forEach(f => {
    const reader = new FileReader();
    reader.onload = e => sendImageMessage(e.target.result, f.name);
    reader.readAsDataURL(f);
  });
  input.value = '';
}

async function sendImageMessage(dataUrl, filename) {
  const me = window.currentUser;
  const to = me.role === 'admin' ? currentChatWith : await getAdminProfile();
  if (!to) return;

  let imageUrl = dataUrl;
  try {
    const bucket = window._db.storage.from('chat-images');
    const blob = await fetch(dataUrl).then(r => r.blob());
    const { data: up, error: upErr } = await bucket.upload(`${me.id}/${Date.now()}-${filename}`, blob);
    if (!upErr && up) {
      imageUrl = bucket.getPublicUrl(up.path).data.publicUrl;
    }
  } catch(_) {}

  try {
    const msg = await dbSendMessage(me.id, to.id, '📷 Image', 'image', { url: imageUrl });
    const msgs = document.getElementById('chat-messages');
    appendMessageBubble(msgs, {...msg, from_id: me.id}, me.id);
    msgs.scrollTop = msgs.scrollHeight;
  } catch(e) { showToast('Failed to send image','error'); }
}

/* ══════════════════════════════════════════════════════════════
   EMOJI PICKER
══════════════════════════════════════════════════════════════ */
const EMOJIS = ['😊','😍','🏠','🏡','🏢','💰','👍','🔑','📍','✅','❤️','🎉','💎','🌿','👋','🤝','📞','☀️','🌙','🎊'];

function toggleEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  if (!emojiPickerBuilt) {
    EMOJIS.forEach(e => {
      const btn = document.createElement('button');
      btn.textContent = e;
      btn.onclick = () => {
        const ta = document.getElementById('chat-textarea');
        if (ta) { ta.value += e; ta.focus(); }
        picker.classList.add('hidden');
      };
      picker.appendChild(btn);
    });
    emojiPickerBuilt = true;
  }
  picker.classList.toggle('hidden');
}

/* ══════════════════════════════════════════════════════════════
   KEYBOARD / TEXTAREA
══════════════════════════════════════════════════════════════ */
function handleMsgKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ══════════════════════════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════════════════════════ */
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (lb && img) { img.src = src; lb.classList.remove('hidden'); }
}
function closeLightbox() { document.getElementById('lightbox')?.classList.add('hidden'); }

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */
function showView(id) {
  document.getElementById('chat-user-selector').style.display = id === 'chat-user-selector' ? 'block' : 'none';
  document.getElementById('chat-convo').style.display         = id === 'chat-convo'         ? 'flex' : 'none';
}

function setUnreadBadge(n) {
  unreadTotal = n;
  const badge = document.getElementById('chat-badge');
  if (!badge) return;
  if (n > 0) { badge.textContent = n > 99 ? '99+' : String(n); badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

async function getAdminProfile() {
  if (!adminId) return null;
  return await dbGetProfile(adminId);
}

function openPropModalById(index) {
  const p = (window.PROPERTIES||[])[index];
  if (p && typeof openPropModal === 'function') openPropModal(p);
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  } catch(_) {}
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatPrice(p) {
  const n = typeof p === 'string' ? parseInt(p.replace(/[^0-9]/g,'')) : p;
  if (!n || isNaN(n)) return String(p||'Price on request');
  if (n >= 1e9) return `UGX ${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `UGX ${(n/1e6).toFixed(0)}M`;
  return `UGX ${n.toLocaleString()}`;
}
function formatPreview(content, type) {
  if (!content) return '—';
  const icons = {image:'📷 Image', location:'📍 Location', property:'🏠 Property'};
  return icons[type] || (content.length > 38 ? content.slice(0,38)+'…' : content);
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-UG',{day:'numeric',month:'short'});
}
function formatDateLabel(dateStr) {
  const d = new Date(dateStr), today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-UG',{weekday:'long',day:'numeric',month:'long'});
}
function strToHue(str) {
  if (!str) return 200;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return Math.abs(h) % 360;
}

/* ── Inject component styles ────────────────────────────────── */
(function injectChatStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .online-dot { display:inline-block;width:7px;height:7px;border-radius:50%;
      background:var(--txt-3);margin-right:5px;vertical-align:middle;transition:background .3s; }
    .online-dot.active { background:var(--green);box-shadow:0 0 6px var(--green); }
    .msg-ticks { font-size:10px;color:var(--txt-3);margin-left:4px; }
    .msg-ticks.read { color:var(--gold); }
    .msg-ticks i { font-size:8px; }
    .msg-ticks i+i { margin-left:-4px; }
    .chat-system-msg { text-align:center;font-size:11px;color:var(--txt-3);
      padding:5px 14px;background:var(--bg-3);border-radius:99px;
      margin:4px auto;max-width:280px;line-height:1.4; }
    .msg-property-card { border-radius:12px;overflow:hidden;border:1px solid var(--border);
      min-width:190px;cursor:pointer;transition:var(--transition);background:var(--bg-card); }
    .msg-property-card:hover { border-color:var(--gold); }
    .mpc-img { height:85px;background-size:cover;background-position:center; }
    .mpc-body { padding:10px 12px; }
    .mpc-price { font-family:var(--font-d);color:var(--gold);font-size:15px;font-weight:600; }
    .mpc-name  { font-size:13px;color:var(--txt);font-weight:500;margin:2px 0; }
    .mpc-addr  { font-size:11px;color:var(--txt-3);display:flex;align-items:center;gap:4px; }
    .chat-loading { display:flex;align-items:center;justify-content:center;
      gap:10px;color:var(--txt-3);font-size:13px;padding:32px;flex-direction:column; }
    .spinner { width:22px;height:22px;border-radius:50%;border:2px solid var(--border-2);
      border-top-color:var(--gold);animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .chat-error { color:var(--red);font-size:12px;padding:16px;text-align:center; }
    .empty-chat-state { display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:40px 20px;text-align:center;color:var(--txt-3);gap:8px; }
    .empty-chat-state i { font-size:30px;margin-bottom:4px; }
    .empty-chat-state p { font-size:14px;font-weight:500;color:var(--txt-2); }
    .empty-chat-state span { font-size:12px; }
    .spl-item { padding:10px 14px;border-radius:8px;border:1px solid var(--border-2);
      background:var(--bg-3);cursor:pointer;transition:var(--transition); }
    .spl-item:hover { border-color:var(--gold);background:var(--gold-dim); }
    .spl-name { font-size:13px;font-weight:600;color:var(--txt); }
    .spl-sub  { font-size:11px;color:var(--gold);margin-top:2px; }
    #emoji-picker:not(.hidden) { display:grid !important; }
  `;
  document.head.appendChild(s);
})();
