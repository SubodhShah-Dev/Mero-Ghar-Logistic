# MeroGhar

**Nepal's home-moving logistics marketplace** — a full-stack web + Android platform that connects customers who are shifting homes with verified movers (truck/tempo owners) across all 7 provinces and 77 districts of Nepal.

> Undergraduate minor project. Built to run entirely on **free tiers and localhost**.

---

## Repo layout

```
MeroGhar-React/
├── backend/          Express 5 REST API (MySQL + SQLite dual-driver)
├── frontend/         Vite + React 19 + TypeScript + Tailwind web app
├── mobile/           React Native 0.79 (Android) app
├── .github/          GitHub Actions: builds + releases the APK
└── render.yaml       Optional free-tier deployment config
```

| App | Stack | Language |
|---|---|---|
| `backend/` | Express 5, mysql2, node:sqlite, JWT, bcrypt | Node ≥ 22.13 (ESM) |
| `frontend/` | Vite 8, React 19, Tailwind 3, React Router 7, Axios | TypeScript |
| `mobile/` | React Native 0.79 (New Architecture), React Navigation 7 | TypeScript |

**Database:** SQLite by default (`DB_DRIVER=auto` falls back to SQLite when MySQL is unreachable). When MySQL is configured, the app keeps a live SQLite mirror via a built-in sync layer (DML mirroring + tombstones + last-write-wins reconciliation). For the demo, **SQLite alone is enough** — no external database account needed.

---

## Demo accounts

Seeded automatically on first run (and whenever the `users` table is empty):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@test.com` | `adminpass123` |
| Vendor (Mover) | `vendor@test.com` | `vendorpass123` |
| Customer | `customer@test.com` | `customerpass123` |

These are **demo credentials only** — do not reuse real accounts.

---

## Run it locally (free, no accounts needed)

### 1. Backend

```bash
cd backend
cp .env.example .env        # optional; sane defaults exist
npm install
npm start                   # http://localhost:5000
```

- Uses the SQLite file `backend/data/meroghar.db` automatically.
- Seeding is automatic for a fresh database.

### 2. Web frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

### 3. Mobile (Android)

```bash
cd mobile
npm install
cd android && ./gradlew assembleRelease   # or assembleDebug
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

- Emulator: the app auto-detects `10.0.2.2:5000` for the backend.
- Device: `adb reverse tcp:5000 tcp:5000` so the phone reaches the backend on `localhost:5000`.
- `debug.keystore`, launcher icons, and RN template resources are included (previously missing).

### Demo script (single flow)

1. Log in as any role (or sign up as a Customer).
2. Customer → **Book** → fill the 5-step wizard → pay via the **demo payment** overlay.
3. Admin → **Shipments** → Approve + assign the seeded mover ("Himalayan Movers").
4. Vendor → **Jobs** → Accept → Start → Complete.
5. Customer → **My Bookings** → status is `delivered`.

---

## Testing

```bash
cd backend
npm test       # node:test integration suite (auth, booking, payment, lifecycle, IDOR)
```

No test runner dependency is required — the suite uses Node's built-in test runner.

---

## Building & releasing the APK

- Locally: `cd mobile/android && ./gradlew assembleRelease`
- CI (GitHub Actions): every push to `main` builds a release APK; a push of tag `v*` creates a GitHub Release with the APK attached. The web app's "Update" dialog points at those releases.
- CI uses Node 22 (matches the repo's Node ≥ 22.13 requirement) and installs the NDK/CMake toolchain in the runner.

---

## Optional: free public hosting

`render.yaml` deploys both apps on Render's **free tiers**:

- Backend runs with `DB_DRIVER=sqlite` (no TiDB/MySQL account needed). Note: Render's free-tier disk is ephemeral — the SQLite file resets on redeploy, and demo seeding refills it, which is harmless for a showcase.
- Frontend is a static site with an SPA rewrite to `index.html`.

Kept optional — the app is designed to run fully on localhost with zero cost.

---

## Architecture & commentary

- **Layered MVC-lite**: routes → controllers → models over a unified pool (`backend/config/db.js`), raw SQL with prepared statements, no ORM.
- **Auth**: bcrypt hashing, JWT (7-day) with role claims (`user` / `vendor` / `admin`); protected routes via `middleware/auth.js`.
- **Booking safety**: `createShipment` re-validates vendor selection server-side (active status, matching available vehicle, "busy vendor" guard under a row lock).
- **Payments**: a self-contained **demo payment page + callback** — no real gateway, no charges. It marks the booking `paid` while leaving it at `pending` so the admin/vendor state machine still works.
- **Chatbot**: rule-based with a keyword-searchable knowledge base (`backend/knowledge-base.json`) — no external AI API needed.
- **Geocoding**: `/api/geocode/*` proxies OpenRouteService (Nepal-only) for distance/time; used as groundwork for smart quoting.