# OptiStore5 — PS5 Package & Homebrew Library

[![Deploy to GitHub Pages](https://github.com/ngesa-cloud/optistore-ps5/actions/workflows/deploy.yml/badge.svg)](https://github.com/ngesa-cloud/optistore-ps5/actions/workflows/deploy.yml)
[![Platform](https://img.shields.io/badge/Platform-PlayStation%205%20%7C%20PS4-0070d1?logo=playstation&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-green.svg)](#)

A high-performance, dark-mode client-side package indexer, TitleID database, and direct remote installer for **PlayStation 5** and **PS4** homebrew packages. Inspired by `optistore.vercel.app` and engineered for the modern jailbreak scene (etaHEN, itemzflow, GoldHEN).

---

## 🚀 Key Features

* **⚡ Multi-Catalog Aggregation:**
  * **DLPSGAME** (`dlps.json`): ~1,439 titles with multi-part archive password tracking.
  * **.exfat / Pippo** (`pippo.json`): ~793 titles with automated Pippo link-lock password warnings (`pippo` lowercase).
  * **PFS Grouped** (`pfs.json`): ~629 titles with automatic TitleID grouping (combining base games, patches, and DLCs into a unified card with cumulative size calculation).
* **🎮 Integrated PS5 Remote PKG Installer:**
  * Direct 1-click package dispatch to your jailbroken console over local LAN (`http://<PS5_IP>:12800/api/install`).
  * Compatible with etaHEN, itemzflow web server, and GoldHEN Remote Package Installer.
* **🔍 Instant Search & Multi-Criteria Filtering:**
  * Debounced keyword search across Title, TitleID (`PPSAxxxxx` / `CUSAxxxxx`), and release notes.
  * Category quick-chips (`Game`, `DLC`, `Update`, `App`, `Theme`, `Demo`).
  * Filter popover: Region selectors (USA, EUR, JPN, ASIA), link availability, and grouped-only flags.
* **🔑 Scene Password Assistant:**
  * Instant 1-click clipboard copy for common archive extraction passwords (`DLPSGAME.COM`, `downloadgameps3.com`, `hako`).
* **📦 Drag-and-Drop Custom JSON Loader:**
  * Drag any custom package dump or personal `.json` file into the browser window to inspect your collection completely offline.
* **📱 Progressive Web App (PWA):**
  * Offline-capable via Service Worker caching (`sw.js`). Can be installed on desktop, mobile, or accessed directly through the PS5 Web Browser.

---

## 🛠️ Architecture & Data Schema

The entire application runs **100% client-side** using vanilla HTML5, modern CSS custom properties, and ES6+ JavaScript.

```
optistore-ps5/
├── index.html              # Main application shell
├── ps5.html                # Direct alias for legacy URL compatibility
├── style.css               # PlayStation dark/OLED design system tokens
├── app.js                  # Normalization, grouping, search, and RPI API client
├── manifest.json           # PWA web manifest
├── sw.js                   # Service Worker for offline asset & catalog caching
├── dlps.json               # Mirrored DLPSGAME package dataset (~5.6MB)
├── pippo.json              # Mirrored .exfat dataset (~950KB)
├── pfs.json                # Mirrored PFS dataset (~1.4MB)
├── scripts/
│   └── sync.js             # Automated dataset sync & validator utility
└── .github/
    └── workflows/
        └── deploy.yml      # Automated GitHub Pages deployment pipeline
```

### Sample Package Object
```json
{
  "title": "Marvel's Spider-Man 2",
  "titleId": "PPSA08338",
  "category": "game",
  "version": "01.002.000",
  "posterUrl": "https://images.example.com/cover.jpg",
  "downloadLinks": [
    { "name": "Part 1 (Direct)", "url": "https://host.com/sm2_p1.pkg" }
  ],
  "description": "Region: USA\nFirmware: 7.61+\nGenre: Action / Adventure"
}
```

---

## 🌐 Live Deployment & Local Setup

### Local Run
No build steps or Node.js runtime required to browse:
```bash
# Clone the repository
git clone https://github.com/ngesa-cloud/optistore-ps5.git
cd optistore-ps5

# Serve locally using any static web server
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

### Syncing Fresh Catalog Datasets
To pull the latest catalog updates from upstream mirrors:
```bash
node scripts/sync.js
```

---

## 🎮 PS5 Remote PKG Installer Configuration

1. Ensure your PS5 is running a jailbreak environment with **etaHEN** or **itemzflow** loaded.
2. In OptiStore5, click the **PS5 IP** button in the top navigation bar.
3. Enter your console's local network IP (e.g. `192.168.1.50`) and API port (default: `12800`).
4. Click **Test Connection** to verify connectivity.
5. In any package view, click **Direct PS5** next to a link to send the install payload directly to your console!

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
