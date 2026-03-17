// ═══════════════════════════════════════════════════════
//  PropVista — Chat System
//  Supports: text, images, audio (MediaRecorder), location,
//  property cards, emoji picker, typing indicator
// ═══════════════════════════════════════════════════════

let mediaRecorder   = null;
let audioChunks     = [];
let isRecording     = false;
let recTimerInterval = null;
let recSeconds       = 0;
let pendingImages    = []; // base64 strings
let emojiOpen        = false;
let chatPollInterval = null;
let lastMsgCount     = 0;
let activeAdminTarget = 'user'; // For admin: which user they're chatting with

const EMOJIS = [
  '😀','😂','😍','😎','🤔','😊','👍','❤️','🔥','✨',
  '🏡','🗝️','📍','📞','💬','💰','🤝','👀','✅','🎉',
  '😅','🤗','😤','🥳','🙏','💪','🌟','🏆','📸','📅',
  '🌿','🏊','🚗','⭐','💡','🔑','🏗️','🌅','🛁','🛋️',
];

// ── INIT CHAT ─────────────────────────────────────────
function initChat() {
  if (!currentUser) return;

  buildEmojiPicker();
  setupChatView();
  renderMessages();
  startChatPoll();

  // Auto-resize textarea
  const ta = document.getElementById('chat-textarea');
  if (ta) {
    ta.addEventListener('input', () => autoResize(ta));
  }
}

function setupChatView() {
  const isAdmin = currentUser.role === 'admin';

  if (isAdmin) {
    // Admin sees user list first
    document.getElementById('chat-user-selector').style.display = 'block';
    document.getElementById('back-to-list-btn').style.display   = 'flex';
    buildAdminUserList();
    // Also show convo by default
    setActiveChatUser('user');
  } else {
    // User sees conversation with admin
    document.getElementById('chat-user-selector').style.display = 'none';
    document.getElementById('chat-with-name').textContent = 'David Kiggundu (Admin)';
    document.getElementById('chat-avatar-display').textContent = 'DK';
    document.getElementById('chat-avatar-display').style.background =
      'linear-gradient(135deg, var(--gold), #a8782e)';
    document.getElementById('chat-status').textContent = 'Online · Usually replies instantly';
  }
}

function buildAdminUserList() {
  const list = document.getElementById('admin-chat-list');
  const msgs = getMessages() || [];

  // Only one demo user for now
  const users = [
    {
      id: 'user',
      name: 'Sarah Namukasa',
      initials: 'SN',
      preview: getLastMsg(msgs, 'user'),
      unread: msgs.filter(m => m.senderId === 'user' && !m.read).length,
    }
  ];

  list.innerHTML = users.map(u => `
    <div class="chat-user-item ${activeAdminTarget === u.id ? 'active' : ''}"
         id="cui-${u.id}" onclick="setActiveChatUser('${u.id}')">
      <div class="cui-avatar">${u.initials}</div>
      <div class="cui-info">
        <div class="cui-name">${u.name}</div>
        <div class="cui-preview">${u.preview}</div>
      </div>
      <div class="cui-meta">
        <div class="cui-time">now</div>
        ${u.unread > 0 ? `<div class="cui-badge">${u.unread}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function getLastMsg(msgs, targetId) {
  const relevant = msgs.filter(m => m.targetUserId === targetId);
  if (!relevant.length) return 'No messages yet';
  const last = relevant[relevant.length - 1];
  if (last.type === 'text') return last.content.slice(0, 40) + (last.content.length > 40 ? '…' : '');
  if (last.type === 'image') return '📷 Image';
  if (last.type === 'audio') return '🎤 Voice note';
  if (last.type === 'location') return '📍 Location';
  if (last.type === 'property') return '🏠 Property';
  return '…';
}

function setActiveChatUser(userId) {
  activeAdminTarget = userId;
  document.querySelectorAll('.chat-user-item').forEach(el => el.classList.remove('active'));
  const cuiEl = document.getElementById('cui-' + userId);
  if (cuiEl) cuiEl.classList.add('active');

  // Update header
  const userData = {
    user: { name: 'Sarah Namukasa', initials: 'SN', color: 'linear-gradient(135deg, var(--blue), #3a6ea8)' },
  };
  const u = userData[userId];
  if (u) {
    document.getElementById('chat-with-name').textContent = u.name;
    document.getElementById('chat-avatar-display').textContent = u.initials;
    document.getElementById('chat-avatar-display').style.background = u.color;
    document.getElementById('chat-status').textContent = 'Buyer · Active now';
  }

  renderMessages();
}

function showAdminChatList() {
  // For admin: scroll up to show user list
  // We keep both visible; just scroll sidebar up
  const selector = document.getElementById('chat-user-selector');
  selector.scrollIntoView({ behavior: 'smooth' });
}

// ── RENDER MESSAGES ────────────────────────────────────
function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const allMsgs = getMessages() || [];
  const targetId = currentUser.role === 'admin' ? activeAdminTarget : 'user';
  const msgs = allMsgs.filter(m => m.targetUserId === targetId);

  // Mark as read
  allMsgs.forEach(m => { if (m.targetUserId === targetId) m.read = true; });
  saveMessages(allMsgs);
  updateChatBadge();

  if (msgs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-comments"></i>
        <p>No messages yet.<br>Start the conversation!</p>
      </div>`;
    return;
  }

  let html = '';
  let lastDate = '';

  msgs.forEach(msg => {
    const date = formatDate(msg.timestamp);
    if (date !== lastDate) {
      html += `<div class="chat-date-divider">${date}</div>`;
      lastDate = date;
    }
    html += buildMessageHTML(msg);
  });

  const prevHeight = container.scrollHeight;
  container.innerHTML = html;

  // Initialize mini maps for location messages
  container.querySelectorAll('[data-loc-init]').forEach(el => {
    const lat = parseFloat(el.dataset.lat);
    const lng = parseFloat(el.dataset.lng);
    const mid = el.id;
    try {
      const miniMap = L.map(mid, {
        center: [lat, lng], zoom: 14,
        zoomControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false,
        touchZoom: false, attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
      L.marker([lat, lng]).addTo(miniMap);
    } catch(e) { /* map already initialized */ }
  });

  // Scroll to bottom if was near bottom
  const wasAtBottom = prevHeight - container.scrollTop - container.clientHeight < 120;
  if (wasAtBottom || lastMsgCount === 0) {
    container.scrollTop = container.scrollHeight;
  }
  lastMsgCount = msgs.length;
}

function buildMessageHTML(msg) {
  const isMe = (currentUser.role === 'admin' && msg.senderId === 'admin') ||
               (currentUser.role === 'user'  && msg.senderId === 'user');

  const side = isMe ? 'sent' : 'recv';
  const initials = msg.senderInitials || '?';
  const avatarClass = msg.senderId === 'admin' ? 'admin' : 'user';

  let bubble = '';

  if (msg.type === 'text') {
    const escaped = msg.content
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>');
    bubble = `<div class="msg-bubble">${escaped}</div>`;

  } else if (msg.type === 'image') {
    bubble = `
      <div class="msg-img" onclick="openLightbox('${msg.content}')">
        <img src="${msg.content}" alt="Shared image" loading="lazy" />
      </div>`;

  } else if (msg.type === 'audio') {
    const waveHTML = buildWaveHTML();
    bubble = `
      <div class="msg-audio">
        <button class="audio-play-btn" onclick="playAudio('${msg.content}', this)">
          <i class="fa-solid fa-play"></i>
        </button>
        <div class="audio-waveform">${waveHTML}</div>
        <span class="audio-dur" id="dur-${msg.id}">${msg.duration || '0:00'}</span>
      </div>`;

  } else if (msg.type === 'location') {
    try {
      const locData = JSON.parse(msg.content);
      const mapId = 'locmap-' + msg.id;
      bubble = `
        <div class="msg-location" onclick="flyToCoords(${locData.lat}, ${locData.lng}, '${locData.label || 'Location'}')">
          <div class="loc-map">
            <div id="${mapId}" class="loc-map-inner" data-loc-init="1" data-lat="${locData.lat}" data-lng="${locData.lng}"></div>
          </div>
          <div class="loc-footer">
            <i class="fa-solid fa-location-dot"></i>
            <span>${locData.label || 'Shared Location'}</span>
            <span class="loc-open">View on map ↗</span>
          </div>
        </div>`;
    } catch { bubble = '<div class="msg-bubble">📍 Location</div>'; }

  } else if (msg.type === 'property') {
    try {
      const propData = JSON.parse(msg.content);
      bubble = `
        <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border);min-width:200px;cursor:pointer;"
             onclick="openPropModal(${propData.id})">
          <div style="height:80px;background:${propData.gradient};display:flex;align-items:center;justify-content:center;font-size:36px;">
            ${PROP_ICONS[propData.type] || '🏠'}
          </div>
          <div style="padding:10px 12px;background:var(--bg-card);">
            <div style="font-family:var(--font-d);font-size:16px;font-weight:600;color:var(--gold);">${propData.price}</div>
            <div style="font-size:13px;font-weight:500;color:var(--txt);margin-top:2px;">${propData.name}</div>
            <div style="font-size:11px;color:var(--txt-3);margin-top:2px;"><i class="fa-solid fa-location-dot"></i> ${propData.address}</div>
            <div style="margin-top:8px;padding:6px 10px;background:var(--gold-dim);border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600;color:var(--gold);text-align:center;">
              Tap to view details
            </div>
          </div>
        </div>`;
    } catch { bubble = '<div class="msg-bubble">🏠 Property</div>'; }
  }

  return `
    <div class="msg-row ${side}">
      <div class="msg-avatar ${avatarClass}">${initials}</div>
      <div class="msg-content">
        ${bubble}
        <div class="msg-time">${formatTime(msg.timestamp)} ${isMe ? '✓✓' : ''}</div>
      </div>
    </div>
  `;
}

function buildWaveHTML() {
  const heights = [4,8,12,16,20,18,14,10,6,10,14,18,20,16,12,8,4,8,12,16];
  return heights.map(h => `<div class="bar" style="height:${h}px;"></div>`).join('');
}

// ── SEND MESSAGE ───────────────────────────────────────
function sendMessage(type, content, extra = {}) {
  if (!currentUser) return;

  const msgs = getMessages() || [];
  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    senderId: currentUser.role,
    senderName: currentUser.name,
    senderInitials: currentUser.initials,
    type,
    content,
    timestamp: Date.now(),
    targetUserId: currentUser.role === 'admin' ? activeAdminTarget : 'user',
    read: false,
    ...extra,
  };

  msgs.push(newMsg);
  saveMessages(msgs);
  renderMessages();

  // If user sends a message, trigger fake admin reply after delay
  if (currentUser.role === 'user' && type === 'text') {
    triggerAdminAutoReply(content);
  }
}

function sendTextMessage() {
  const ta = document.getElementById('chat-textarea');
  const text = ta.value.trim();

  // Send pending images first
  if (pendingImages.length > 0) {
    pendingImages.forEach(imgData => sendMessage('image', imgData));
    pendingImages = [];
    document.getElementById('img-preview-row').classList.add('hidden');
    document.getElementById('img-preview-row').innerHTML = '';
  }

  if (text) {
    sendMessage('text', text);
    ta.value = '';
    autoResize(ta);
  }
}

function handleMsgKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
}

// ── IMAGE UPLOAD ───────────────────────────────────────
function handleImageUpload(input) {
  const files = Array.from(input.files);
  const previewRow = document.getElementById('img-preview-row');
  previewRow.classList.remove('hidden');

  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      pendingImages.push(dataUrl);

      const item = document.createElement('div');
      item.className = 'preview-item';
      item.innerHTML = `
        <img src="${dataUrl}" alt="preview" />
        <div class="preview-remove" onclick="removePendingImage(this, '${dataUrl.slice(0,20)}')">×</div>
      `;
      previewRow.appendChild(item);
    };
    reader.readAsDataURL(file);
  });

  input.value = '';
}

function removePendingImage(el, prefix) {
  const item = el.parentElement;
  const idx = pendingImages.findIndex(d => d.startsWith(prefix));
  if (idx !== -1) pendingImages.splice(idx, 1);
  item.remove();
  if (pendingImages.length === 0) {
    document.getElementById('img-preview-row').classList.add('hidden');
  }
}

// ── AUDIO RECORDING ────────────────────────────────────
async function toggleAudioRecord() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = finalizeAudio;
    mediaRecorder.start();

    isRecording = true;
    recSeconds = 0;
    document.getElementById('recording-preview').classList.remove('hidden');
    document.getElementById('audio-record-btn').classList.add('recording');
    document.getElementById('audio-record-btn').title = 'Stop Recording';

    recTimerInterval = setInterval(() => {
      recSeconds++;
      const m = Math.floor(recSeconds / 60);
      const s = recSeconds % 60;
      document.getElementById('rec-timer').textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }, 1000);

  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showToast('Microphone permission denied. Please allow mic access.', 'info');
    } else {
      showToast('Could not access microphone: ' + err.message, 'info');
    }
  }
}

function stopRecording() {
  if (!mediaRecorder || !isRecording) return;
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(t => t.stop());
  clearInterval(recTimerInterval);
  isRecording = false;
  document.getElementById('recording-preview').classList.add('hidden');
  document.getElementById('audio-record-btn').classList.remove('recording');
  document.getElementById('audio-record-btn').title = 'Record Audio';
}

function cancelRecording() {
  if (mediaRecorder) {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = null;
    try { mediaRecorder.stop(); } catch(e){}
    try { mediaRecorder.stream.getTracks().forEach(t => t.stop()); } catch(e){}
  }
  clearInterval(recTimerInterval);
  isRecording = false;
  audioChunks = [];
  document.getElementById('recording-preview').classList.add('hidden');
  document.getElementById('audio-record-btn').classList.remove('recording');
}

function finalizeAudio() {
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const url  = URL.createObjectURL(blob);
  const duration = formatDuration(recSeconds);
  sendMessage('audio', url, { duration });
  audioChunks = [];
}

function playAudio(src, btn) {
  const audio = new Audio(src);
  const icon  = btn.querySelector('i');
  icon.className = 'fa-solid fa-pause';
  audio.onended = () => { icon.className = 'fa-solid fa-play'; };
  audio.onerror = () => {
    icon.className = 'fa-solid fa-play';
    showToast('Audio not available (demo recording expired)', 'info');
  };
  audio.play().catch(() => {
    icon.className = 'fa-solid fa-play';
    showToast('Could not play audio', 'info');
  });
}

function formatDuration(s) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2,'0')}`;
}

// ── LOCATION SHARING ───────────────────────────────────
function shareLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser', 'info');
    return;
  }

  showToast('Getting your location…', 'info');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const locData = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: currentUser.role === 'admin'
          ? 'Site Visit Location — PropVista'
          : 'My Current Location',
      };
      sendMessage('location', JSON.stringify(locData));
      showToast('Location shared!', 'success');
    },
    () => {
      // Fallback: use Kampala city center as demo
      const fallback = {
        lat: 0.3200 + (Math.random() - .5) * .02,
        lng: 32.5900 + (Math.random() - .5) * .02,
        label: currentUser.role === 'admin'
          ? 'PropVista Office, Kampala'
          : 'Shared Location (Demo)',
      };
      sendMessage('location', JSON.stringify(fallback));
      showToast('Location shared (demo coordinates)', 'gold');
    },
    { timeout: 6000, enableHighAccuracy: false }
  );
}

// ── EMOJI PICKER ───────────────────────────────────────
function buildEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  picker.innerHTML = EMOJIS.map(e =>
    `<button onclick="insertEmoji('${e}')" title="${e}">${e}</button>`
  ).join('');
}

function toggleEmojiPicker() {
  emojiOpen = !emojiOpen;
  document.getElementById('emoji-picker').classList.toggle('hidden', !emojiOpen);
  document.getElementById('emoji-btn').style.color = emojiOpen ? 'var(--gold)' : '';
}

function insertEmoji(emoji) {
  const ta = document.getElementById('chat-textarea');
  const pos = ta.selectionStart;
  ta.value = ta.value.slice(0, pos) + emoji + ta.value.slice(pos);
  ta.selectionStart = ta.selectionEnd = pos + emoji.length;
  ta.focus();
  autoResize(ta);
}

// Close emoji picker when clicking outside
document.addEventListener('click', e => {
  if (emojiOpen && !e.target.closest('#emoji-picker') && !e.target.closest('#emoji-btn')) {
    emojiOpen = false;
    document.getElementById('emoji-picker')?.classList.add('hidden');
    document.getElementById('emoji-btn')?.style.removeProperty('color');
  }
});

// ── TYPING INDICATOR (simulated) ─────────────────────
function showTypingIndicator(show) {
  document.getElementById('typing-wrapper').style.display = show ? 'block' : 'none';
  if (show) {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
  }
}

// ── AUTO-REPLY (simulates admin responding to user) ────
const AUTO_REPLIES = [
  "Thank you for reaching out! I'll check on that for you right away.",
  "Great question! The property is still available — would you like to schedule a viewing?",
  "I can arrange a site visit this weekend. Does Saturday 10am work for you?",
  "The price is negotiable for serious buyers. What's your budget?",
  "I'll send you the site location shortly so you can find it easily.",
  "The property has a clear title and all legal documents are ready.",
  "We have a very flexible payment plan available. Let's discuss!",
  "Thank you! I'll get back to you with more details shortly.",
];

function triggerAdminAutoReply(userMsg) {
  // Only when user is chatting (simulate admin typing and replying)
  const delay = 1500 + Math.random() * 2000;

  setTimeout(() => showTypingIndicator(true), 800);

  setTimeout(() => {
    showTypingIndicator(false);

    const lowerMsg = userMsg.toLowerCase();
    let reply;

    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) {
      reply = "The price listed is the asking price, but there's always room for discussion for serious buyers. What's your budget range?";
    } else if (lowerMsg.includes('visit') || lowerMsg.includes('view') || lowerMsg.includes('see') || lowerMsg.includes('tour')) {
      reply = "Absolutely! I can arrange a viewing for you. I'll drop the site location pin for you now.";
      // Also send location after a short delay
      setTimeout(() => {
        const locData = { lat: 0.3376, lng: 32.5933, label: 'PropVista — Site Visit Point' };
        const adminMsg = {
          id: 'msg-auto-loc-' + Date.now(),
          senderId: 'admin',
          senderName: 'David Kiggundu',
          senderInitials: 'DK',
          type: 'location',
          content: JSON.stringify(locData),
          timestamp: Date.now() + 100,
          targetUserId: 'user',
          read: false,
        };
        const msgs = getMessages() || [];
        msgs.push(adminMsg);
        saveMessages(msgs);
        renderMessages();
      }, 2000);
    } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      reply = `Hello ${currentUser.name.split(' ')[0]}! 👋 Great to hear from you. How can I help you find your perfect property today?`;
    } else if (lowerMsg.includes('bedroom') || lowerMsg.includes('bath') || lowerMsg.includes('size')) {
      reply = "I can share the full specification sheet with you! The property has plenty of space. Would you like me to send you photos or arrange a call?";
    } else {
      reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
    }

    const adminReply = {
      id: 'msg-auto-' + Date.now(),
      senderId: 'admin',
      senderName: 'David Kiggundu',
      senderInitials: 'DK',
      type: 'text',
      content: reply,
      timestamp: Date.now(),
      targetUserId: 'user',
      read: false,
    };

    const msgs = getMessages() || [];
    msgs.push(adminReply);
    saveMessages(msgs);
    renderMessages();
    updateChatBadge();

    // Rebuild admin user list if admin panel visible
    if (currentUser.role === 'admin') buildAdminUserList();

  }, delay);
}

// ── CHAT POLLING (simulate real-time) ─────────────────
function startChatPoll() {
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(() => {
    const msgs = getMessages() || [];
    const targetId = currentUser.role === 'admin' ? activeAdminTarget : 'user';
    const currentCount = msgs.filter(m => m.targetUserId === targetId).length;

    if (currentCount !== lastMsgCount) {
      renderMessages();
    }
    updateChatBadge();
    if (currentUser.role === 'admin') buildAdminUserList();
  }, 2000);
}

// ── HELPERS ────────────────────────────────────────────
function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
}
