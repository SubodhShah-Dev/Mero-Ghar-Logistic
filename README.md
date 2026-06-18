# MeroGhar - Nepal's Trusted Household Movers

Full-stack logistics platform (Vite + Tailwind + vanilla JS, Express + MySQL, Android via Capacitor).

## Download APK

[**Download MeroGhar v2.0.0 APK**](https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases/latest/download/MeroGhar-v2.0.0.apk)

## Features

- Multi-step booking form with distance-based quotes
- Real-time shipment tracking with Leaflet maps
- Vendor portal (fleet management, job assignment)
- Admin panel (dashboard, approvals, user management)
- **MeroBot AI Chatbot** — Gemini-powered assistant on every page (no setup needed)
- In-app update checker with one-tap APK download/install
- Supports all 7 provinces of Nepal

## Tech Stack

Vite · Tailwind CSS · vanilla JS · Express · MySQL (Railway) · Capacitor 8 · Google Gemini

## Quick Start

```bash
git clone https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic.git
cd Mero-Ghar-Logistic
npm install
# Edit backend/.env with your MySQL credentials
# Terminal 1: cd backend && node server.js
# Terminal 2: npm run dev
```

## Build APK

```bash
npm run build && npx cap sync android
JAVA_HOME=/path/to/jdk21 ./gradlew assembleDebug   # from android/
```

APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

All releases: https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases

Private
