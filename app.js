// ═══════════════════════════════════════════════════════
//  PropVista — App Logic (auth, map, properties, modals)
// ═══════════════════════════════════════════════════════

let currentUser = null;
let map = null;
let markers = [];
let currentFilter = 'all';
let currentPropertyId = null;
let streetLayer = null;
let satLayer = null;

// ── INIT ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initMessages();
  const session = getSession();
  if (session) {
    currentUser = session;
    showApp();
  } else {
    showLogin();
  }
});

// ── AUTH ──────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app-page').classList.remove('active');
}

function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app-page').classList.add('active');
  setupNav();
  initMap();
  renderSidebar();
  initChat();
  updateChatBadge();
}

function doLogin() {
  const email = document.getElementById('email-input').value.trim();
  const pass  = document.getElementById('pass-input').value.trim();
  const errEl = document.getElementById('login-error');

  errEl.classList.add('hidden');

  const accounts = Object.values(DEMO_ACCOUNTS);
  const match = accounts.find(a => a.email === email && a.password === pass);
  if (!match) {
    errEl.textContent = 'Invalid email or password. Use the demo buttons below.';
    errEl.classList.remove('hidden');
    return;
  }

  currentUser = { ...match };
  saveSession(currentUser);
  showApp();
}

function loginAs(role) {
  const acc = DEMO_ACCOUNTS[role];
  document.getElementById('email-input').value = acc.email;
  document.getElementById('pass-input').value = acc.password;
  setTimeout(doLogin, 80);
}

function logout() {
  clearSession();
  currentUser = null;
  if (map) { map.remove(); map = null; }
  markers = [];
  document.getElementById('chat-panel').classList.add('collapsed');
  document.getElementById('chat-panel').classList.remove('open');
  showLogin();
}

// ── NAV ───────────────────────────────────────────────
function setupNav() {
  const roleEl  = document.getElementById('nav-role');
  const nameEl  = document.getElementById('nav-username');
  roleEl.textContent = currentUser.role === 'admin' ? 'Admin' : 'Buyer';
  roleEl.className = 'nav-role-badge ' + currentUser.role;
  nameEl.textContent = currentUser.name;

  if (currentUser.role === 'admin') {
    document.getElementById('admin-nav-stats').style.display = 'flex';
    document.getElementById('admin-fab').style.display = 'flex';
    updateAdminStats();
  }
}

function updateAdminStats() {
  document.getElementById('stat-total').textContent = PROPERTIES.length;
  document.getElementById('stat-avail').textContent = PROPERTIES.filter(p => p.status === 'available').length;
  document.getElementById('stat-sold').textContent  = PROPERTIES.filter(p => p.status === 'sold').length;
}

// ── MAP ───────────────────────────────────────────────
function initMap() {
  if (map) return;

  map = L.map('map', {
    center: [0.3200, 32.5900],
    zoom: 12,
    zoomControl: true,
  });

  streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  });

  satLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri World Imagery', maxZoom: 19 }
  );

  streetLayer.addTo(map);
  placeMarkers();
}

function setMapView(btn, type) {
  document.querySelectorAll('.map-view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (type === 'satellite') {
    map.removeLayer(streetLayer);
    satLayer.addTo(map);
  } else {
    map.removeLayer(satLayer);
    streetLayer.addTo(map);
  }
}

function placeMarkers() {
  // Remove old
  markers.forEach(m => m.marker && map.removeLayer(m.marker));
  markers = [];

  PROPERTIES.forEach(prop => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="map-marker ${prop.status === 'sold' ? 'sold' : ''}">${shortPrice(prop.price)}</div>`,
      iconAnchor: [40, 28],
    });

    const m = L.marker([prop.lat, prop.lng], { icon })
      .addTo(map)
      .bindPopup(buildPopupHTML(prop), { maxWidth: 260 });

    m.on('click', () => highlightSidebarCard(prop.id));
    markers.push({ id: prop.id, marker: m });
  });
}

function shortPrice(price) {
  const num = parseInt(price.replace(/[^0-9]/g, ''));
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return Math.round(num / 1e6) + 'M';
  return price;
}

function buildPopupHTML(prop) {
  return `
    <div class="map-popup">
      <div class="pop-img" style="background:${prop.gradient}; display:flex;align-items:center;justify-content:center;">
        <span style="font-size:40px;">${PROP_ICONS[prop.type] || '🏠'}</span>
      </div>
      <div class="pop-body">
        <div class="pop-price">${prop.price}</div>
        <div class="pop-name">${prop.name}</div>
        <div class="pop-addr"><i class="fa-solid fa-location-dot" style="color:var(--red);font-size:10px;"></i> ${prop.address}</div>
        <button class="pop-btn" onclick="openPropModal(${prop.id})">View Details</button>
      </div>
    </div>
  `;
}

function flyToProperty(id) {
  const prop = PROPERTIES.find(p => p.id === id);
  if (!prop) return;
  map.flyTo([prop.lat, prop.lng], 15, { duration: 1.2 });
  const m = markers.find(m => m.id === id);
  if (m) setTimeout(() => m.marker.openPopup(), 1300);
}

function flyToCoords(lat, lng, label) {
  map.flyTo([lat, lng], 16, { duration: 1.2 });
  const icon = L.divIcon({
    className: '',
    html: `<div style="background:var(--red);color:#fff;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.5);">
      <i class='fa-solid fa-location-dot'></i> ${label}
    </div>`,
    iconAnchor: [50, 28],
  });
  const pin = L.marker([lat, lng], { icon }).addTo(map);
  setTimeout(() => map.removeLayer(pin), 8000);
}

// ── SIDEBAR ───────────────────────────────────────────
let activeCardId = null;

function renderSidebar() {
  const list = document.getElementById('property-list');
  const searchVal = document.getElementById('search-input').value.toLowerCase();

  let props = PROPERTIES.filter(p => {
    const matchFilter = currentFilter === 'all' || p.status === currentFilter;
    const matchSearch = !searchVal ||
      p.name.toLowerCase().includes(searchVal) ||
      p.address.toLowerCase().includes(searchVal) ||
      p.type.toLowerCase().includes(searchVal);
    return matchFilter && matchSearch;
  });

  if (props.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-building"></i><p>No properties found</p></div>`;
    return;
  }

  list.innerHTML = props.map(p => buildCardHTML(p)).join('');
}

function buildCardHTML(prop) {
  const favActive = isFavorite(prop.id) ? 'active' : '';
  const favIcon   = isFavorite(prop.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  const bedsLabel = prop.beds > 0 ? `<span><i class="fa-solid fa-bed"></i>${prop.beds} Beds</span>` : '';
  const bathLabel = prop.baths > 0 ? `<span><i class="fa-solid fa-shower"></i>${prop.baths} Baths</span>` : '';

  return `
    <div class="prop-card ${activeCardId === prop.id ? 'active' : ''}" id="card-${prop.id}" onclick="selectProperty(${prop.id})">
      <div class="prop-img">
        <div class="img-bg" style="background:${prop.gradient};display:flex;align-items:center;justify-content:center;">
          <span style="font-size:42px;opacity:.8;">${PROP_ICONS[prop.type] || '🏠'}</span>
        </div>
        <div class="prop-status ${prop.status}">${prop.status}</div>
        <div class="prop-fav ${favActive}" id="fav-${prop.id}" onclick="event.stopPropagation();toggleFav(${prop.id})">
          <i class="${favIcon}"></i>
        </div>
      </div>
      <div class="prop-body">
        <div class="prop-price">${prop.price}</div>
        <div class="prop-name">${prop.name}</div>
        <div class="prop-addr"><i class="fa-solid fa-location-dot"></i>${prop.address}</div>
        <div class="prop-meta">
          ${bedsLabel}${bathLabel}
          <span><i class="fa-solid fa-ruler-combined"></i>${prop.area} sqm</span>
        </div>
      </div>
      <div class="prop-footer">
        <button class="prop-action-btn primary" onclick="event.stopPropagation();openPropModal(${prop.id})">Details</button>
        <button class="prop-action-btn secondary" onclick="event.stopPropagation();flyToProperty(${prop.id})">Map</button>
      </div>
    </div>
  `;
}

function selectProperty(id) {
  activeCardId = id;
  renderSidebar();
  flyToProperty(id);
}

function highlightSidebarCard(id) {
  activeCardId = id;
  document.querySelectorAll('.prop-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('card-' + id);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setFilter(btn, filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderSidebar();
}

function filterProperties() { renderSidebar(); }

function toggleFav(id) {
  const added = toggleFavorite(id);
  const el = document.getElementById('fav-' + id);
  if (el) {
    el.className = 'prop-fav' + (added ? ' active' : '');
    el.innerHTML = `<i class="${added ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
  }
  showToast(added ? 'Added to favourites' : 'Removed from favourites', added ? 'gold' : 'info');
}

// ── PROPERTY MODAL ─────────────────────────────────────
function openPropModal(id) {
  const prop = PROPERTIES.find(p => p.id === id);
  if (!prop) return;
  currentPropertyId = id;

  document.getElementById('modal-img').style.background = prop.gradient;
  document.getElementById('modal-img').innerHTML =
    `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span style="font-size:90px;opacity:.6;">${PROP_ICONS[prop.type] || '🏠'}</span></div>`;

  document.getElementById('modal-status').innerHTML =
    `<div class="prop-status ${prop.status}">${prop.status}</div>`;

  document.getElementById('modal-price').textContent = prop.price;
  document.getElementById('modal-name').textContent  = prop.name;
  document.getElementById('modal-addr').innerHTML =
    `<i class="fa-solid fa-location-dot"></i>${prop.address}`;
  document.getElementById('modal-desc').textContent = prop.description;

  const specsData = [
    { val: prop.beds || '—', lbl: 'Bedrooms' },
    { val: prop.baths || '—', lbl: 'Bathrooms' },
    { val: prop.area + ' sqm', lbl: 'Area' },
    { val: prop.year || 'N/A', lbl: 'Built' },
  ];
  document.getElementById('modal-specs').innerHTML =
    specsData.map(s => `
      <div class="modal-spec">
        <div class="spec-val">${s.val}</div>
        <div class="spec-lbl">${s.lbl}</div>
      </div>
    `).join('');

  const isAdmin = currentUser.role === 'admin';
  document.getElementById('modal-actions').innerHTML = isAdmin
    ? `<button class="modal-btn primary" onclick="sharePropertyToChat(${id}); closePropModalDirect();">
         <i class="fa-solid fa-share"></i> Share in Chat
       </button>
       <button class="modal-btn secondary" onclick="markPropertyStatus(${id})">
         <i class="fa-solid fa-pen"></i> Edit Status
       </button>`
    : `<button class="modal-btn primary" onclick="enquireAboutProperty(${id}); closePropModalDirect();">
         <i class="fa-regular fa-comment-dots"></i> Enquire Now
       </button>
       <button class="modal-btn secondary" onclick="flyToProperty(${id}); closePropModalDirect();">
         <i class="fa-solid fa-map-location-dot"></i> Show on Map
       </button>`;

  document.getElementById('prop-modal').classList.add('open');
}

function closePropModal(e) {
  if (e.target === document.getElementById('prop-modal')) closePropModalDirect();
}

function closePropModalDirect() {
  document.getElementById('prop-modal').classList.remove('open');
}

function enquireAboutProperty(id) {
  const prop = PROPERTIES.find(p => p.id === id);
  if (!prop) return;
  openChat();
  setTimeout(() => {
    document.getElementById('chat-textarea').value =
      `Hi, I'm interested in "${prop.name}" listed at ${prop.price}. Could you tell me more?`;
    document.getElementById('chat-textarea').focus();
  }, 350);
}

function markPropertyStatus(id) {
  const prop = PROPERTIES.find(p => p.id === id);
  if (!prop) return;
  const next = { available: 'reserved', reserved: 'sold', sold: 'available' };
  prop.status = next[prop.status];
  renderSidebar();
  placeMarkers();
  updateAdminStats();
  closePropModalDirect();
  showToast(`Property marked as "${prop.status}"`, 'gold');
}

// ── ADD PROPERTY MODAL (Admin) ──────────────────────────
function openAddPropertyModal() {
  document.getElementById('add-prop-modal').classList.add('open');
}

function closeAddModal(e) {
  if (e.target === document.getElementById('add-prop-modal')) closeAddModalDirect();
}

function closeAddModalDirect() {
  document.getElementById('add-prop-modal').classList.remove('open');
}

function submitAddProperty() {
  const name = document.getElementById('f-name').value.trim();
  const addr = document.getElementById('f-addr').value.trim();
  const price = document.getElementById('f-price').value.trim();
  const type  = document.getElementById('f-type').value;
  const beds  = parseInt(document.getElementById('f-beds').value) || 0;
  const baths = parseInt(document.getElementById('f-baths').value) || 0;
  const area  = document.getElementById('f-area').value.trim() || '0';
  const status = document.getElementById('f-status').value;
  const lat   = parseFloat(document.getElementById('f-lat').value) || 0.3200;
  const lng   = parseFloat(document.getElementById('f-lng').value) || 32.5900;
  const desc  = document.getElementById('f-desc').value.trim();

  if (!name || !addr || !price) {
    showToast('Please fill in Name, Address, and Price', 'info');
    return;
  }

  const newProp = {
    id: Date.now(),
    name, address: addr,
    price: 'UGX ' + price,
    rawPrice: parseInt(price.replace(/,/g, '')) || 0,
    type, beds, baths, area, lat, lng, status,
    gradient: PROP_GRADIENTS[PROPERTIES.length % PROP_GRADIENTS.length],
    description: desc || 'No description provided.',
    features: [],
    year: new Date().getFullYear(),
  };

  PROPERTIES.push(newProp);
  renderSidebar();
  placeMarkers();
  updateAdminStats();
  closeAddModalDirect();
  showToast(`"${name}" added successfully!`, 'success');

  // Clear form
  ['f-name','f-addr','f-price','f-beds','f-baths','f-area','f-lat','f-lng','f-desc']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ── SHARE PROPERTY PICKER ────────────────────────────────
function openSharePropertyPicker() {
  const list = document.getElementById('share-prop-list');
  list.innerHTML = PROPERTIES.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;border:1px solid var(--border-2);cursor:pointer;transition:var(--transition);"
         onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border-2)'"
         onclick="sharePropertyToChat(${p.id}); closeShareModalDirect();">
      <div style="width:44px;height:44px;border-radius:8px;background:${p.gradient};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${PROP_ICONS[p.type]||'🏠'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
        <div style="font-size:12px;color:var(--gold);">${p.price}</div>
      </div>
      <div class="prop-status ${p.status}" style="position:static;">${p.status}</div>
    </div>
  `).join('');
  document.getElementById('share-prop-modal').classList.add('open');
}

function closeShareModal(e) {
  if (e.target === document.getElementById('share-prop-modal')) closeShareModalDirect();
}

function closeShareModalDirect() {
  document.getElementById('share-prop-modal').classList.remove('open');
}

function sharePropertyToChat(id) {
  const prop = PROPERTIES.find(p => p.id === id);
  if (!prop) return;
  const content = JSON.stringify({
    id: prop.id,
    name: prop.name,
    price: prop.price,
    address: prop.address,
    type: prop.type,
    gradient: prop.gradient,
    status: prop.status,
  });
  sendMessage('property', content);
  openChat();
  showToast('Property shared in chat!', 'gold');
}

// ── CHAT TOGGLE ───────────────────────────────────────
function toggleChat() {
  const panel = document.getElementById('chat-panel');
  panel.classList.toggle('collapsed');
  panel.classList.toggle('open');
  if (!panel.classList.contains('collapsed')) {
    updateChatBadge();
  }
}

function openChat() {
  const panel = document.getElementById('chat-panel');
  panel.classList.remove('collapsed');
  panel.classList.add('open');
  updateChatBadge();
}

function updateChatBadge() {
  const msgs = getMessages() || [];
  const myId = currentUser?.role;
  const unread = msgs.filter(m => m.senderId !== myId && !m.read).length;
  const badge = document.getElementById('chat-badge');
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ── CALL ACTION ────────────────────────────────────────
function callAction(type) {
  const action = type === 'video' ? 'Video call' : 'Voice call';
  showToast(`${action} feature requires a backend service. Coming soon!`, 'info');
}

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: 'fa-circle-check', info: 'fa-circle-info', gold: 'fa-star' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; }, 2800);
  setTimeout(() => toast.remove(), 3100);
}

// ── LIGHTBOX ──────────────────────────────────────────
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
}
