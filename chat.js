/* ════════════════════════════════════════════════════════════
   PropVista — Real AI Chat (powered by Claude)
   chat.js — Drop-in replacement for demo chat
════════════════════════════════════════════════════════════ */

/* ── Conversation history (per session) ── */
let aiMessages = [];
let isAiResponding = false;
let chatOpen = false;
let unreadCount = 0;
let emojiPickerBuilt = false;

/* ── Build system prompt from live property data ── */
function buildSystemPrompt() {
  // Try to pull live data from the app's global PROPERTIES array (from data.js)
  let propContext = '';
  try {
    const props = window.PROPERTIES || window.properties || [];
    if (props.length) {
      const listing = props.map(p =>
        `• ${p.name} — ${p.address || p.location || ''} | ` +
        `${formatPrice(p.price)} | ` +
        `${p.beds || 0} bed, ${p.baths || 0} bath | ` +
        `${p.area || '?'} sqm | ` +
        `Status: ${p.status || 'available'} | ` +
        `Type: ${p.type || 'Property'}`
      ).join('\n');
      propContext = `\n\nCURRENT PROPERTY LISTINGS:\n${listing}`;
    }
  } catch (e) {}

  return `You are PropVista AI, a knowledgeable and friendly luxury real estate assistant for PropVista — a premium property platform serving Kampala and Greater Uganda.

Your personality:
- Professional yet warm and approachable
- Expert in Uganda real estate: Kampala neighbourhoods, Entebbe, Mukono, Wakiso, Jinja etc.
- You know about property investment, mortgages, land titles (Mailo, Leasehold, Freehold), and legal processes
- You're concise — max 3–4 short paragraphs unless the user asks for detail
- Use UGX for prices. When mentioning USD, add the approximate UGX equivalent
- You can recommend properties based on user needs and budget
- Be proactive: ask clarifying questions to help match users to the right property
- Use light formatting (short bullets, bold **key words**) to make answers scannable
- Never make up property data — only reference what's in the listings below
- If asked about a property not in the list, say so honestly and offer to help find alternatives
- For bookings and viewings, direct users to contact the admin team via the chat

${propContext}

Today's date: ${new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function formatPrice(p) {
  if (!p) return 'Price on request';
  const n = typeof p === 'string' ? parseInt(p.replace(/[^0-9]/g, '')) : p;
  if (!n || isNaN(n)) return p;
  if (n >= 1_000_000_000) return `UGX ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(0)}M`;
  return `UGX ${n.toLocaleString()}`;
}

/* ── Send message to Claude API ── */
async function callClaudeAPI(userMessage) {
  // Add user message to history
  aiMessages.push({ role: 'user', content: userMessage });

  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: buildSystemPrompt(),
    messages: aiMessages
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const assistantText = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Add assistant response to history
  aiMessages.push({ role: 'assistant', content: assistantText });

  return assistantText;
}

/* ── Render markdown-lite to HTML ── */
function renderMarkdown(text) {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lines
    .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul style="margin:6px 0 6px 16px;padding:0;">${m}</ul>`)
    // Line breaks
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    // Clean empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '');
}

/* ── Append a message bubble ── */
function appendMessage(role, content, isHtml = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const now = new Date().toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  const isUser = role === 'user';

  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
  wrap.style.cssText = `
    display: flex;
    flex-direction: ${isUser ? 'row-reverse' : 'row'};
    align-items: flex-end;
    gap: 8px;
    margin: 6px 12px;
    animation: msgSlideIn 0.25s ease;
  `;

  if (!isUser) {
    const avatar = document.createElement('div');
    avatar.style.cssText = `
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #d4af37, #a8782e);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #0a0c14;
      flex-shrink: 0;
    `;
    avatar.textContent = 'AI';
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.cssText = `
    max-width: 78%;
    padding: 9px 13px;
    border-radius: ${isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
    font-size: 13px;
    line-height: 1.55;
    ${isUser
      ? 'background: linear-gradient(135deg, #d4af37, #b8922a); color: #0a0c14;'
      : 'background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.9);'
    }
  `;

  if (isHtml) {
    bubble.innerHTML = content;
  } else if (!isUser) {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  // Timestamp
  const ts = document.createElement('div');
  ts.style.cssText = 'font-size:10px; color: rgba(255,255,255,0.3); margin-top:4px; text-align:right;';
  ts.textContent = now;
  bubble.appendChild(ts);

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;

  // Increment unread if chat is closed
  if (!chatOpen && role === 'ai') {
    unreadCount++;
    const badge = document.getElementById('chat-badge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
    }
  }

  return wrap;
}

/* ── Show / hide typing indicator ── */
function setTyping(show) {
  const wrapper = document.getElementById('typing-wrapper');
  if (wrapper) wrapper.style.display = show ? 'block' : 'none';
  const container = document.getElementById('chat-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

/* ── Main send function ── */
async function sendTextMessage() {
  if (isAiResponding) return;

  const textarea = document.getElementById('chat-textarea');
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) return;

  textarea.value = '';
  textarea.style.height = 'auto';

  // Hide quick replies after first message
  const qr = document.getElementById('quick-replies');
  if (qr) qr.style.display = 'none';

  appendMessage('user', text);
  isAiResponding = true;
  setTyping(true);

  try {
    const reply = await callClaudeAPI(text);
    setTyping(false);
    appendMessage('ai', reply);
  } catch (err) {
    setTyping(false);
    appendMessage('ai', `Sorry, I ran into an issue connecting to the AI service. Please try again in a moment. _(${err.message})_`);
    console.error('Claude API error:', err);
  }

  isAiResponding = false;
}

/* ── Quick reply chips ── */
function sendQuickReply(text) {
  const textarea = document.getElementById('chat-textarea');
  if (textarea) textarea.value = text;
  sendTextMessage();
}

/* ── Keyboard shortcut ── */
function handleMsgKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
}

/* ── Auto-resize textarea ── */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ── Toggle chat panel ── */
function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chat-panel');
  if (!panel) return;

  if (chatOpen) {
    panel.classList.remove('collapsed');
    unreadCount = 0;
    const badge = document.getElementById('chat-badge');
    if (badge) badge.classList.add('hidden');

    // Show welcome message on first open
    const msgs = document.getElementById('chat-messages');
    if (msgs && msgs.children.length === 0) {
      showWelcomeMessage();
    }
  } else {
    panel.classList.add('collapsed');
  }
}

/* ── Welcome message ── */
function showWelcomeMessage() {
  const currentUser = window.currentUser || {};
  const name = currentUser.name || currentUser.username || 'there';

  appendMessage('ai',
    `Hello${name !== 'there' ? `, **${name}**` : ''}! 👋 I'm the PropVista AI assistant.\n\n` +
    `I can help you:\n` +
    `• Find properties that match your budget and needs\n` +
    `• Explain the buying/renting process in Uganda\n` +
    `• Provide information on specific listings\n` +
    `• Answer questions about Kampala neighbourhoods\n\n` +
    `What are you looking for today?`
  );
}

/* ── Clear chat ── */
function clearAIChat() {
  aiMessages = [];
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  const qr = document.getElementById('quick-replies');
  if (qr) qr.style.display = 'flex';
  showWelcomeMessage();
}

/* ── Share location in chat ── */
function shareLocation() {
  if (!navigator.geolocation) {
    appendMessage('user', '📍 [Location sharing not supported]');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const locText = `📍 My location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      const textarea = document.getElementById('chat-textarea');
      if (textarea) textarea.value = locText;
      sendTextMessage();
    },
    () => {
      if (typeof showToast === 'function') showToast('Location access denied', 'error');
    }
  );
}

/* ── Image upload ── */
function handleImageUpload(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  const preview = document.getElementById('img-preview-row');
  if (preview) {
    preview.classList.remove('hidden');
    preview.innerHTML = '';
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.cssText = 'height:60px;border-radius:6px;object-fit:cover;cursor:pointer;';
        img.onclick = () => openLightbox(e.target.result);
        preview.appendChild(img);
      };
      reader.readAsDataURL(f);
    });
  }
  // Describe the image to the AI
  appendMessage('user', `📷 [Shared ${files.length} image${files.length > 1 ? 's' : ''}]`, false);
  sendQuickReply('I just shared an image. Can you help me with this property inquiry?');
  input.value = '';
}

/* ── Emoji picker ── */
const EMOJI_LIST = ['😊','😍','🏠','🏡','🏢','🏗','🌟','💰','👍','🔑','📍','✅','❤️','🎉','💎','🌿','☀️','🌙','🤝','📞'];

function toggleEmojiPicker() {
  if (!emojiPickerBuilt) {
    const picker = document.getElementById('emoji-picker');
    if (picker) {
      EMOJI_LIST.forEach(e => {
        const btn = document.createElement('button');
        btn.textContent = e;
        btn.onmouseenter = () => btn.style.transform = 'scale(1.3)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => insertEmoji(e);
        picker.appendChild(btn);
      });
      // Don't add inline display style — style.css already handles .emoji-picker as a grid
      emojiPickerBuilt = true;
    }
  }
  const picker = document.getElementById('emoji-picker');
  if (picker) picker.classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const ta = document.getElementById('chat-textarea');
  if (ta) {
    ta.value += emoji;
    ta.focus();
  }
  const picker = document.getElementById('emoji-picker');
  if (picker) picker.classList.add('hidden');
}

/* ── Share property picker ── */
function openSharePropertyPicker() {
  const list = document.getElementById('share-prop-list');
  const modal = document.getElementById('share-prop-modal');
  if (!list || !modal) return;

  const props = window.PROPERTIES || window.properties || [];
  list.innerHTML = props.map((p, i) => `
    <div onclick="sharePropertyInChat(${i})" style="
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: all 0.2s ease;
    " onmouseenter="this.style.background='rgba(212,175,55,0.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.04)'">
      <div style="font-weight:600; font-size:13px; color:rgba(255,255,255,0.9);">${p.name}</div>
      <div style="font-size:11px; color:rgba(212,175,55,0.8); margin-top:2px;">${formatPrice(p.price)} · ${p.status || 'available'}</div>
      <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-top:1px;">${p.address || p.location || ''}</div>
    </div>
  `).join('');

  modal.classList.add('active');
  modal.style.display = 'flex';
}

function sharePropertyInChat(index) {
  closeShareModal();
  const props = window.PROPERTIES || window.properties || [];
  const p = props[index];
  if (!p) return;

  const msg = `Tell me about the property: "${p.name}" (${p.address || p.location || ''})`;
  const qr = document.getElementById('quick-replies');
  if (qr) qr.style.display = 'none';
  const textarea = document.getElementById('chat-textarea');
  if (textarea) textarea.value = msg;
  sendTextMessage();
}

function closeShareModal(e) {
  if (e && e.target !== document.getElementById('share-prop-modal')) return;
  const modal = document.getElementById('share-prop-modal');
  if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
}

/* ── Image lightbox ── */
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (lb && img) {
    img.src = src;
    lb.classList.remove('hidden');
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.add('hidden');
}

/* ── Admin: show chat list (stub for backward compat) ── */
function showAdminChatList() {}

/* ── Inject slide-in animation ── */
(function injectStyle() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes msgSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    /* chat-messages layout is already handled by style.css (.chat-messages flex col gap-12) */
    /* Just ensure scroll-behavior and paragraph resets for AI markdown output */
    #chat-messages { scroll-behavior: smooth; }
    #chat-messages p { margin: 0 0 4px; }
    #chat-messages ul { color: inherit; }
    /* quick-replies flex wrap */
    #quick-replies { flex-wrap: wrap; }
    /* emoji picker: style.css uses grid, keep that - just ensure it works when toggled */
    #emoji-picker:not(.hidden) { display: grid !important; }
  `;
  document.head.appendChild(s);
})();
