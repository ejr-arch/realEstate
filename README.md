# 🏠 PropVista — Luxury Real Estate Platform

[![CI/CD](https://github.com/YOUR-USERNAME/YOUR-REPO-NAME/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/YOUR-USERNAME/YOUR-REPO-NAME/actions/workflows/ci-cd.yml)
![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-222?logo=github)
![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Map-Leaflet.js-199900?logo=leaflet)
![License](https://img.shields.io/badge/license-MIT-green)

> Browse premium property listings across Kampala, communicate directly with the owner, share locations, voice notes, images — all in one place.

**🌐 Live Site → [your-username.github.io/your-repo-name](https://your-username.github.io/your-repo-name)**

---

![PropVista Screenshot](https://via.placeholder.com/1200x600/0c0c10/c8a45a?text=PropVista+—+Luxury+Real+Estate)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Interactive Map** | Leaflet.js map with price-label markers for every listing |
| 🏡 **Property Listings** | Filter by status (available / reserved / sold), search by name or area |
| 💬 **Live Chat** | Real-time messaging between buyer and admin |
| 📷 **Image Sharing** | Upload and share property photos directly in chat |
| 🎤 **Voice Notes** | Record and send audio messages via MediaRecorder API |
| 📍 **Location Drop** | Share GPS coordinates or site visit pin in chat, clickable on map |
| 🏠 **Property Cards in Chat** | Share full listing cards directly into the conversation |
| 😊 **Emoji Picker** | 40+ emoji quick-insert |
| 👤 **Dual Roles** | Separate Admin and Buyer views with different permissions |
| ➕ **Add Listings** | Admin can add new properties live via form |
| 🔁 **Status Control** | Admin can cycle property status (available → reserved → sold) |
| ❤️ **Favourites** | Buyers can save favourite listings (persisted in localStorage) |
| 🌍 **Street + Satellite** | Toggle between OpenStreetMap and Esri satellite tiles |
| 📱 **Responsive** | Works on desktop, tablet, and mobile |

---

## 🔐 Demo Accounts

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin (Owner)** | admin@propvista.ug | admin123 | Add properties, manage statuses, chat with all buyers |
| **Buyer** | user@demo.com | demo123 | Browse listings, enquire, chat with admin |

> Or just click the **quick demo buttons** on the login screen — no typing needed.

---

## 🗂️ Project Structure

```
propvista/
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # GitHub Actions pipeline
├── index.html              # Full app shell (login + app layout)
├── style.css               # All styles — dark luxury theme
├── data.js                 # Demo properties, accounts, localStorage helpers
├── app.js                  # Auth, map, property cards, modals
├── chat.js                 # Chat engine — all media types + auto-reply
└── README.md
```

---

## 🚀 CI/CD Pipeline

The pipeline runs automatically on every push to `main` and every pull request.

```
push to main
    │
    ├── 🔍 Lint & Validate
    │       HTMLHint · ESLint · JS syntax check
    │
    ├── 🏗️ Build
    │       Minify HTML · CSS · JS
    │       Stamp build SHA · Report bundle sizes
    │
    ├── 💬 PR Comment  (pull requests only)
    │       Posts bundle sizes and build status to the PR
    │
    └── 🚀 Deploy → GitHub Pages  (main only)
            Publishes dist/ to gh-pages branch
            Site live at https://YOUR-USERNAME.github.io/YOUR-REPO-NAME
```

**Zero secrets needed** — only `GITHUB_TOKEN` which GitHub provides automatically.

---

## 🛠️ Run Locally

No build tools required — just open the file:

```bash
# Clone the repo
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# Open directly in browser
open index.html
```

Or serve with any static server:

```bash
# Python
python3 -m http.server 3000

# Node (npx)
npx serve .
```

Then visit `http://localhost:3000`.

---

## 🗺️ Map Data

Property coordinates are set in `data.js`. Each property has a `lat` and `lng` field pointing to a real Kampala neighbourhood:

| Property | Area | Status |
|---|---|---|
| Kololo Heights Villa | Kololo Hill | Available |
| Naguru View Apartment | Naguru | Available |
| Bugolobi Modern House | Bugolobi | Reserved |
| Ntinda Executive Flat | Ntinda | Available |
| Muyenga Lake View Estate | Muyenga | Available |
| Kisaasi Family Home | Kisaasi | Sold |
| Lubowa Prime Land | Lubowa, Wakiso | Available |

---

## 💬 Chat Capabilities

| Message Type | Sender | Notes |
|---|---|---|
| Text | Both | Shift+Enter for new line, Enter to send |
| Images | Both | Multiple files, preview before send |
| Voice Note | Both | Requires microphone permission |
| Location Pin | Both | Uses GPS; falls back to demo coords |
| Property Card | Both | Tappable card that opens full listing |
| Emoji | Both | 40-emoji picker |

---

## ⚙️ Tech Stack

- **Frontend** — Vanilla HTML, CSS, JavaScript (no framework)
- **Map** — [Leaflet.js](https://leafletjs.com/) + OpenStreetMap tiles
- **Icons** — [Font Awesome 6](https://fontawesome.com/)
- **Fonts** — Cormorant Garamond (display) + Outfit (body) via Google Fonts
- **Audio** — Web MediaRecorder API (browser-native)
- **Storage** — localStorage (chat history + favourites)
- **CI/CD** — GitHub Actions
- **Hosting** — GitHub Pages

---

## 🔮 Roadmap

- [ ] Real-time chat via WebSockets / Firebase
- [ ] Video & voice calls (WebRTC)
- [ ] User registration & auth backend
- [ ] Property image uploads to cloud storage
- [ ] Advanced map filters (price range, area, type)
- [ ] Mortgage calculator widget
- [ ] WhatsApp / email enquiry integration
- [ ] Admin analytics dashboard

---

## 📄 License

MIT © [Your Name] — free to use, modify, and distribute.
