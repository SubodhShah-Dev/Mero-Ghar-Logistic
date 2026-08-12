# MeroGhar

**Nepal's home-moving logistics marketplace** — an Android app + Express backend that connects customers who are shifting homes with verified movers (truck/tempo owners) across all 7 provinces and 77 districts of Nepal.

> Undergraduate minor project. Runs entirely on localhost: Android app ↔ Express API ↔ MySQL (XAMPP).

---

## Repo layout

```
MeroGhar-React/
├── backend/          Express 5 REST API (MySQL via mysql2)
├── mobile/           React Native 0.79 (Android) app
└── .github/          GitHub Actions: builds + releases the APK
```

| App | Stack | Language |
|---|---|---|
| `backend/` | Express 5, mysql2, JWT, bcrypt | Node ≥ 22.13 (ESM) |
| `mobile/` | React Native 0.79 (New Architecture), React Navigation 7 | TypeScript |

**Database:** MySQL/MariaDB from **XAMPP** (localhost:3306). The database (`meroghar_db`) and all tables are created automatically on first start; demo data is seeded automatically.

---

## Demo accounts

Seeded automatically on first run (and whenever the `users` table is empty):

| Role | Email | Password |
|---|---|---|
| Super Admin (global) | `admin@test.com` | `adminpass123` |
| Branch Admin ×7 (one per province) | `branchadmin@test.com` (Bagmati) · `ba.koshi@test.com` … `ba.sudurpashchim@test.com` | `branchadminpass123` |
| Regional Vendor ×7 (one per province) | `vendor@test.com` (Bagmati) · `vendor.koshi@test.com` … `vendor.sudurpashchim@test.com` | `vendorpass123` |
| Customer | `customer@test.com` | `customerpass123` |

These are **demo credentials only** — do not reuse real accounts.

---

## Run it locally

### 1. Start MySQL (XAMPP)

```bash
# Linux (XAMPP installed in /opt/lampp)
sudo /opt/lampp/lampp startmysql

# Windows/macOS: open the XAMPP Control Panel and press Start next to MySQL
```

Optional: create the database manually in phpMyAdmin (`http://localhost/phpmyadmin`) or let the backend create it for you.

### 2. Backend

```bash
cd backend
cp .env.example .env    # optional; sane XAMPP defaults exist
npm install
npm start               # http://localhost:5000
```

- Uses XAMPP's MySQL on `127.0.0.1:3306` (user `root`, empty password).
- Creates `meroghar_db` + all tables and seeds demo accounts on first run (only while `NODE_ENV` is not `production`).

### 3. Mobile (Android)

```bash
cd mobile
npm install
cd android && ./gradlew assembleRelease   # or assembleDebug
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

- **Emulator:** the app auto-detects `10.0.2.2:5000` for the backend.
- **Physical device (same WiFi):** `adb reverse tcp:5000 tcp:5000` in debug; for a release APK, change `PROD_API_URL` in `mobile/src/config.ts` to your PC's LAN IP, e.g. `http://192.168.1.20:5000`, and rebuild.
- **Physical device (NOT on the same WiFi):** see "Remote access" below.

### Demo script (single flow)

1. Log in as any role (or sign up as a Customer).
2. Customer → **Book** → fill the 5-step wizard → pay via the **demo payment** overlay.
3. Admin → **Shipments** → Approve + assign the seeded mover ("Himalayan Movers").
4. Vendor → **Jobs** → Accept → Start → Complete.
5. Customer → **My Bookings** → status is `delivered`.

---

## Remote access (free, phone not on same WiFi)

Keep the backend reachable from anywhere — no account, no credit card — using a **Cloudflare quick tunnel**:

```bash
# install once: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cd backend && bash scripts/tunnel.sh
```

It starts the backend on `:5000`, opens a tunnel, and prints a public URL like:

```
https://<random-words>.trycloudflare.com
```

Copy that URL into `mobile/src/config.ts` → `PROD_API_URL`, then rebuild the APK. The URL changes every time the script restarts, so update the constant and rebuild before a remote demo.

---

## Testing

```bash
cd backend
npm test       # node:test integration suite (auth, booking, payment, lifecycle, IDOR)
```

Requires XAMPP MySQL running; the suite uses a disposable `meroghar_test` database that it creates and drops itself.

---

## Building & releasing the APK

- Locally: `cd mobile/android && ./gradlew assembleRelease`
- CI (GitHub Actions): every push to `main` builds a release APK; a push of tag `v*` creates a GitHub Release with the APK attached.
- CI uses Node 22 and installs the NDK/CMake toolchain in the runner.

## Free cloud deploy (no PC needed, anywhere in the world)

The release APK points at `https://meroghar-backend.onrender.com` (`mobile/src/config.ts`:
`PROD_API_URL`). Keeping that URL alive for free requires two free services:

1. **TiDB Cloud Starter** — free, always-on, MySQL-compatible DB (5 GiB row + 50M
   Request Units/month, no credit card). This replaces XAMPP in the cloud so demo
   data survives redeploys.
   - Export your local data once: `sudo /opt/lampp/lampp startmysql` then
     `bash backend/scripts/export-for-tidb.sh`
   - Create a Starter cluster, import the dump with its CLI as the script prints.
2. **Render (free tier)** — deploys the backend from this repo. In the Render
   dashboard: **New → Blueprint**, point it at this repo, and it reads
   `render.yaml`. Add the TiDB `MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQL_DATABASE`
   env vars (`DB_SSL=true`) in the service settings.

- Render free spins down after ~15 min idle → the next request wakes it in ~1 min.
  That's fine for demo day: open the app ~1 min before presenting.
- Everything (DB, backend, CI, releases) stays at $0 while inside free quotas.

---

## Architecture & commentary

- **Layered MVC-lite**: routes → controllers → models over a unified MySQL pool (`backend/config/db.js`), raw SQL with prepared statements, no ORM.
- **Auth**: bcrypt hashing, JWT (7-day) with role claims (`user` / `vendor` / `admin`); protected routes via `middleware/auth.js`.
- **Booking safety**: `createShipment` re-validates vendor selection server-side (active status, matching available vehicle, "busy vendor" guard under a row lock).
- **Payments**: a self-contained **demo payment page + callback** — no real gateway, no charges. It marks the booking `paid` while leaving it at `pending` so the admin/vendor state machine still works.
- **Chatbot**: rule-based with a keyword-searchable knowledge base (`backend/knowledge-base.json`) — no external AI API needed.
- **Geocoding**: `/api/geocode/*` proxies OpenRouteService (Nepal-only) for distance/time; used as groundwork for smart quoting.