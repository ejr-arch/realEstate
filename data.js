// ═══════════════════════════════════════════════════════
//  PropVista — Demo Data
// ═══════════════════════════════════════════════════════

const DEMO_ACCOUNTS = {
  admin: {
    email: 'admin@propvista.ug',
    password: 'admin123',
    name: 'David Kiggundu',
    role: 'admin',
    initials: 'DK',
    phone: '+256 700 123 456',
  },
  user: {
    email: 'user@demo.com',
    password: 'demo123',
    name: 'Sarah Namukasa',
    role: 'user',
    initials: 'SN',
    phone: '+256 752 987 654',
  },
};

// Gradient-based property images (no external img dependency)
const PROP_GRADIENTS = [
  'linear-gradient(135deg, #1a2634 0%, #2d4a3e 50%, #1a3a2a 100%)',
  'linear-gradient(135deg, #2d1f3d 0%, #3d2a1f 50%, #2a1f3d 100%)',
  'linear-gradient(135deg, #1f2d3d 0%, #2a3d1f 50%, #1f3d2a 100%)',
  'linear-gradient(135deg, #3d2a1a 0%, #2a1a3d 50%, #1a3d2a 100%)',
  'linear-gradient(135deg, #1a3d2d 0%, #3d1a2d 50%, #2d3d1a 100%)',
  'linear-gradient(135deg, #2d3d1a 0%, #1a2d3d 50%, #3d1a2d 100%)',
];

const PROP_ICONS = {
  Villa: '🏛️', Apartment: '🏢', House: '🏠',
  Land: '🌿', Commercial: '🏬', Estate: '🏰',
};

const PROPERTIES = [
  {
    id: 1,
    name: 'Kololo Heights Villa',
    address: 'Kololo Hill, Kampala',
    price: 'UGX 850,000,000',
    rawPrice: 850000000,
    type: 'Villa',
    beds: 5, baths: 4, area: '450',
    lat: 0.3376, lng: 32.5933,
    status: 'available',
    gradient: PROP_GRADIENTS[0],
    description: 'A magnificent 5-bedroom villa perched on Kololo Hill with panoramic views of Kampala. Features a private swimming pool, landscaped garden, 2 servant quarters, double garage, and state-of-the-art security. Close to international schools and embassies.',
    features: ['Swimming Pool', 'Garden', 'Generator', 'CCTV', 'Garage'],
    year: 2020,
  },
  {
    id: 2,
    name: 'Naguru View Apartment',
    address: 'Naguru, Kampala',
    price: 'UGX 320,000,000',
    rawPrice: 320000000,
    type: 'Apartment',
    beds: 3, baths: 2, area: '180',
    lat: 0.3458, lng: 32.6024,
    status: 'available',
    gradient: PROP_GRADIENTS[1],
    description: 'Modern 3-bedroom apartment on the 8th floor with sweeping city views. Open-plan kitchen, quality finishes, backup power, and 24/7 concierge. Ideal for professionals and young families seeking a secure urban lifestyle.',
    features: ['Elevator', 'Concierge', 'Backup Power', 'Parking', 'Gym'],
    year: 2022,
  },
  {
    id: 3,
    name: 'Bugolobi Modern House',
    address: 'Bugolobi, Kampala',
    price: 'UGX 480,000,000',
    rawPrice: 480000000,
    type: 'House',
    beds: 4, baths: 3, area: '280',
    lat: 0.3238, lng: 32.6142,
    status: 'reserved',
    gradient: PROP_GRADIENTS[2],
    description: 'Contemporary 4-bedroom home in the sought-after Bugolobi neighbourhood. Features open-plan living, chef\'s kitchen, private garden, servant quarters and double garage. Walking distance to Acacia Mall and LJS.',
    features: ['Garden', 'Double Garage', 'Solar', 'Borehole', 'CCTV'],
    year: 2019,
  },
  {
    id: 4,
    name: 'Ntinda Executive Flat',
    address: 'Ntinda, Kampala',
    price: 'UGX 280,000,000',
    rawPrice: 280000000,
    type: 'Apartment',
    beds: 2, baths: 2, area: '120',
    lat: 0.3554, lng: 32.6185,
    status: 'available',
    gradient: PROP_GRADIENTS[3],
    description: 'Sleek 2-bedroom executive apartment in Ntinda. Modern fittings, tiled floors, open balcony with garden views. Secure compound with parking, backup generator and reliable water supply. Perfect for first-time buyers or investors.',
    features: ['Balcony', 'Generator', 'Parking', 'Security', 'Water Tank'],
    year: 2021,
  },
  {
    id: 5,
    name: 'Muyenga Lake View Estate',
    address: 'Muyenga, Kampala',
    price: 'UGX 1,200,000,000',
    rawPrice: 1200000000,
    type: 'Estate',
    beds: 6, baths: 5, area: '780',
    lat: 0.2933, lng: 32.6012,
    status: 'available',
    gradient: PROP_GRADIENTS[4],
    description: 'An extraordinary lakeside estate in Muyenga with breathtaking views of Lake Victoria. This trophy property features 6 en-suite bedrooms, home theatre, wine cellar, infinity pool, spa room, staff quarters, and a private jetty. The pinnacle of Kampala luxury living.',
    features: ['Lake View', 'Infinity Pool', 'Jetty', 'Home Theatre', 'Wine Cellar', 'Spa'],
    year: 2023,
  },
  {
    id: 6,
    name: 'Kisaasi Family Home',
    address: 'Kisaasi, Kampala',
    price: 'UGX 390,000,000',
    rawPrice: 390000000,
    type: 'House',
    beds: 4, baths: 3, area: '320',
    lat: 0.3732, lng: 32.6098,
    status: 'sold',
    gradient: PROP_GRADIENTS[5],
    description: 'A well-maintained 4-bedroom family home in peaceful Kisaasi. Features a mature garden, separate servant quarters, solar water heater, double garage and borehole. Close to Kisaasi Primary School and Bukoto market. A wonderful family home.',
    features: ['Garden', 'Solar Water', 'Borehole', 'Garage', 'Servant Quarters'],
    year: 2017,
  },
  {
    id: 7,
    name: 'Lubowa Prime Land',
    address: 'Lubowa, Wakiso',
    price: 'UGX 650,000,000',
    rawPrice: 650000000,
    type: 'Land',
    beds: 0, baths: 0, area: '2000',
    lat: 0.2568, lng: 32.5467,
    status: 'available',
    gradient: 'linear-gradient(135deg, #1a2e1a 0%, #2e3d1a 50%, #1a2e2e 100%)',
    description: 'Prime 50-decimals plot in Lubowa with clear land title (freehold). Gentle slope with panoramic views. Accessible tarmac road, electricity at the plot. Ideal for luxury villa or apartment development. Soil report available on request.',
    features: ['Freehold Title', 'Road Access', 'Electricity', 'Water Line', 'Survey Map'],
    year: null,
  },
];

// ── Seed chat messages ──────────────────────────────────
const SEED_MESSAGES = [
  {
    id: 'seed-1',
    senderId: 'admin',
    senderName: 'David Kiggundu',
    senderInitials: 'DK',
    type: 'text',
    content: 'Hello Sarah! 👋 Welcome to PropVista. I\'m David, your dedicated property advisor. How can I help you today?',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    targetUserId: 'user',
  },
  {
    id: 'seed-2',
    senderId: 'user',
    senderName: 'Sarah Namukasa',
    senderInitials: 'SN',
    type: 'text',
    content: 'Hi David! I\'m interested in the Kololo Heights Villa. Can you tell me more about it?',
    timestamp: Date.now() - 1000 * 60 * 60 * 1.8,
    targetUserId: 'user',
  },
  {
    id: 'seed-3',
    senderId: 'admin',
    senderName: 'David Kiggundu',
    senderInitials: 'DK',
    type: 'text',
    content: 'Absolutely! The Kololo villa is one of our flagship properties. It sits on 30 decimals with an incredible view of the city. The owner is open to negotiation for serious buyers. Would you like to arrange a site visit?',
    timestamp: Date.now() - 1000 * 60 * 60 * 1.6,
    targetUserId: 'user',
  },
  {
    id: 'seed-4',
    senderId: 'user',
    senderName: 'Sarah Namukasa',
    senderInitials: 'SN',
    type: 'text',
    content: 'Yes, I\'d love that! When is it convenient?',
    timestamp: Date.now() - 1000 * 60 * 30,
    targetUserId: 'user',
  },
  {
    id: 'seed-5',
    senderId: 'admin',
    senderName: 'David Kiggundu',
    senderInitials: 'DK',
    type: 'location',
    content: JSON.stringify({ lat: 0.3376, lng: 32.5933, label: 'Kololo Heights Villa — Site Visit Point' }),
    timestamp: Date.now() - 1000 * 60 * 25,
    targetUserId: 'user',
  },
  {
    id: 'seed-6',
    senderId: 'admin',
    senderName: 'David Kiggundu',
    senderInitials: 'DK',
    type: 'text',
    content: 'Here\'s the exact location for the site visit. You can reach the gate from Kololo Hill Road. Saturday 10am works well — shall I confirm that for you?',
    timestamp: Date.now() - 1000 * 60 * 24,
    targetUserId: 'user',
  },
];

// ── localStorage helpers ────────────────────────────────
function getMessages() {
  try {
    const raw = localStorage.getItem('pv_messages');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveMessages(msgs) {
  localStorage.setItem('pv_messages', JSON.stringify(msgs));
}

function initMessages() {
  if (!getMessages()) {
    saveMessages(SEED_MESSAGES);
  }
}

function getSession() {
  try {
    const raw = sessionStorage.getItem('pv_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(user) {
  sessionStorage.setItem('pv_session', JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem('pv_session');
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('pv_favs') || '[]'); } catch { return []; }
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else favs.splice(idx, 1);
  localStorage.setItem('pv_favs', JSON.stringify(favs));
  return idx === -1;
}

function isFavorite(id) { return getFavorites().includes(id); }
