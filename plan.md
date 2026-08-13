# Plan: Full multi-branch RBAC seed (branch admin + regional vendor per province)

Date: 2026-08-12 · **Status: ✅ implemented & verified 2026-08-12** (42/42 backend tests pass;
7 branch admins + 7 regional vendors seeded; scopes verified via login + `/api/admin/branches`)

## Goal

Restore the complete RBAC test setup so the project has, for **each** of Nepal's 7
provinces (branches), one **Branch Admin** and one **regional Vendor**, plus the global
Super Admin and a Customer — instead of only a Bagmati-only pair.

## Background / root cause (already audited)

- The live `meroghar_db` was imported from the old pre-RBAC dump
  (`backend/meroghar-export.sql`): 3 legacy accounts
  (`subodh@meroghar.com`/user, `admin@meroghar.com`/role `admin`, `vendor@meroghar.com`/vendor),
  **old** `users.role enum('user','vendor','admin')`, and a `vendors` table without
  `branch_id`.
- `backend/config/db.js` `ensureSchema()` uses `CREATE TABLE IF NOT EXISTS`, so stale
  tables are never upgraded → the new 4-role enum and `vendors.branch_id` never appear,
  and the new `seed()` (which runs only when `users` is empty) never executes.
- Consequence: only the 3 legacy accounts exist; Branch Admin and per-region Vendors are
  absent, and even `SEED_DEMO_DATA=true` would fail on the old enum/schema.

## Change 1 — Rework `seed()` in `backend/config/db.js`

Keep the global Super Admin and Customer, then loop over all 7 branches creating a
Branch Admin and a regional Vendor for each.

### Accounts created (shared passwords per role)

| Province (branch) | Branch Admin (`...pass123` = `branchadminpass123`) | Regional Vendor (`vendorpass123`) | Business name |
|---|---|---|---|
| Koshi | `ba.koshi@test.com` | `vendor.koshi@test.com` | Koshi Movers |
| Madhesh | `ba.madhesh@test.com` | `vendor.madhesh@test.com` | Madhesh Movers |
| Bagmati | `branchadmin@test.com` (kept) | `vendor@test.com` (kept) | Himalayan Movers |
| Gandaki | `ba.gandaki@test.com` | `vendor.gandaki@test.com` | Gandaki Movers |
| Lumbini | `ba.lumbini@test.com` | `vendor.lumbini@test.com` | Lumbini Movers |
| Karnali | `ba.karnali@test.com` | `vendor.karnali@test.com` | Karnali Movers |
| Sudurpashchim | `ba.sudurpashchim@test.com` | `vendor.sudurpashchim@test.com` | Sudurpashchim Movers |

Plus:
- `admin@test.com` / `adminpass123` — `super_admin` (global scope, `branches: null`)
- `customer@test.com` / `customerpass123` — `user`

### Per-region data (loop)

For each branch:
1. Insert branch admin user (`role='branch_admin'`) + one `user_branches` row.
2. Insert vendor user (`role='vendor'`) + one `vendors` row (`branch_id` = branch,
   `status='active'`, sample owner/address) + 1 Cargo Tempo vehicle + 2 **local-only**
   routes (within the same province, districts from `mobile/src/utils/nepal.ts`).

Local route pairs (from→to):
- Koshi: Jhapa→Morang, Sunsari→Jhapa
- Madhesh: Siraha→Saptari, Dhanusha→Siraha
- Gandaki: Kaski→Tanahun, Syangja→Kaski
- Lumbini: Rupandehi→Kapilvastu, Dang→Rupandehi
- Karnali: Surkhet→Salyan, Jumla→Surkhet
- Sudurpashchim: Kailali→Kanchanpur, Doti→Kailali
- Bagmati (Himalayan Movers): keep existing Kathmandu→Lalitpur + Bagmati→Gandaki routes.

### Why local-only routes (keeps `backend/test/api.test.js` green)

Vendor matching and explicit-vendor assignment are route-aware
(`vendorModel.js:vendorCoversRoute`, `shipmentController.js:139-154`). Local-only routes
avoid matching the assertions at `api.test.js:529` (Sudurpashchim→Karnali must return 0)
and `:537` (Bagmati Mini Truck must return 0). **All regional vendors get Cargo Tempo, not
Mini Truck.**

### Critical: seed insertion order

`getAllVendors` returns `ORDER BY v.created_at DESC` (`vendorModel.js:18`), and tests pick
`find((v) => v.status === 'active')` (first active) for explicit auto-assigned bookings
(`api.test.js:253,597,622`) that are **Bagmati routes**. Therefore **insert Himalayan
Movers (Bagmati) LAST** so it is the first listed active vendor. Otherwise a non-Bagmati
regional vendor would be picked and rejected on route coverage.

## Change 2 — Tests / docs (nothing required, verified)

- No reference to new accounts in `api.test.js` is required (Bagmati keeps
  `branchadmin@test.com` / `vendor@test.com` — logins at `:918` and `:113` unchanged).
- Update `README.md:31-37` demo-account table to list Super Admin, Customer, Branch Admin
  ×7 (`ba.<province>@test.com`), Regional Vendor ×7 (`vendor.<province>@test.com`), with
  shared passwords.
- Update `backend/config/db.js` seed footer `console.log` to print the new scheme.

## Execution steps (planned)

1. Start XAMPP MySQL and drop the stale DB:
   `sudo /opt/lampp/lampp startmysql && /opt/lampp/bin/mysql -u root -e "DROP DATABASE IF EXISTS meroghar_db;"`
2. Start backend (`cd backend && npm start`) → `init()` recreates schema (12 tables,
   new 4-role enum) and `seed()` runs on the empty `users` table.
3. Verify:
   - `cd backend && npm test` — full suite (uses disposable `meroghar_test`).
   - Manual logins + scope: `ba.gandaki@test.com`, `vendor.lumbini@test.com`,
     `admin@test.com`; check `GET /api/admin/branches` and `GET /api/vendor/profile`.
4. If the deployed Render/TiDB instance needs parity: re-run
   `bash backend/scripts/export-for-tidb.sh` and import the fresh dump.

## Execution log — what was actually done (2026-08-12)

### 1. Code change — `backend/config/db.js`

Rewrote `seed()` (the `users` empty-table gate at `init()` stays untouched):

- Kept `admin@test.com` (super_admin, global) and `customer@test.com` (user).
- Added a `regions` array (6 rows, one per province except Bagmati) and a loop that, per
  region, inserts: a `branch_admin` user + `user_branches` row; a `vendor` user + `vendors`
  row (`branch_id` = own branch, `status='active'`, sample owner/address); 1 Cargo Tempo
  vehicle; 2 **local-only** routes using real district names
  (`mobile/src/utils/nepal.ts`). Bagmati's documented accounts (`branchadmin@test.com`,
  `vendor@test.com` / Himalayan Movers) are inserted **after** the loop, unchanged apart
  from `busy`-guard ordering (below).
- Seed footer `console.log` now prints the full credential scheme.

### 2. Deviation: explicit `created_at` stamps (bug found during validation)

First test run failed at `api.test.js:595`/`:621` ("booking created, 400 !== 201"). Root
cause: MariaDB `created_at` has **1-second resolution**, so all vendors seeded in the same
second tied in `ORDER BY v.created_at DESC` (`vendorModel.js:18`); `find(v => v.status
==='active')` then picked a non-Bagmati regional mover whose local-only routes don't cover
the test's Kathmandu→Lalitpur move (`vendorCoversRoute` → reject).

Fix: each vendor insert now passes an explicit `created_at` — regional vendors get
incrementing past stamps (`2026-08-12T10:00:00Z` + `idx` minutes) and Himalayan Movers gets
`2026-08-12 12:00:00`, guaranteeing it is the newest row and therefore first in admin
listings. This preserves the "insert Bagmati last" rule deterministically regardless of
run timing.

### 3. Validation runs

- Unit/seed sanity: `npm test` against a **throwaway** MariaDB (temp datadir, port 3306)
  → **42/42 pass**. Cleaned up the temp instance afterward.
- Note: during cleanup a leftover throwaway MariaDB from a previous session (port 3307,
  shared `/tmp` datadir) was found and stopped.

### 4. Live database — real XAMPP reseed

The real XAMPP MariaDB (data dir `/opt/lampp/var/mysql`, root-owned) was confirmed running
on 127.0.0.1:3306 as the `mysql` user (it required root to start, which was provided
outside this session). Steps taken on the real server:

1. `DROP DATABASE IF EXISTS meroghar_db;` (old schema + 3 legacy accounts removed).
2. Ran backend `init()` → recreated `meroghar_db` with the new 12-table schema and ran the
   new `seed()`.

### 5. Verification on the real XAMPP DB

SQL inspection confirmed:
- **16 users**: 1 super_admin (GLOBAL), 7 branch_admins (7 `user_branches` rows), 7
  vendors (each `vendors.branch_id` = own branch), 1 customer.
- `users.role` enum = `enum('user','vendor','branch_admin','super_admin')`.
- 7 branches, 7 vendors (Koshi→Sudurpashchim Movers + Himalayan Movers/Bagmati), 14 vendor
  routes, 1 demo shipment.

Live API checks (temp `server.js` on port 5300):
- `ba.karnali@test.com` → `GET /api/admin/branches` returns only `Karnali Province`.
- `vendor.koshi@test.com` → `GET /api/vendor/profile` returns `Koshi Movers`.
- Full suite against the live server: **`node --test` → 42/42 pass**.

### 6. Nothing else — README

`README.md:31-37` demo-account table updated to the 4-row (Super Admin · Branch Admin ×7 ·
Regional Vendor ×7 · Customer) scheme. No `api.test.js` edits were needed because the
Bagmati accounts keep their original emails.

## Files changed

- `backend/config/db.js` — per-region seed loop + explicit `created_at` ordering.
- `README.md` — demo-account table.
- `plan.md` — this file.
- (No changes to `api.test.js`, `schema.js`, or `backend/schema.sql`.)

## Out of scope

- Schema migration code (ALTER TABLE) — intentionally bypassed via DB reset.
- Extra per-branch sample shipments — optional later; branch dashboards may start empty.

---

# Follow-up: install & run the app on Android via GitHub

Date: 2026-08-12 · **Status: ✅ repo changes done & committed (localhost) — cloud deploy steps remain (push + tag)**

## Context (verified against the deployed backend)

- Release APKs point at `https://meroghar-backend.onrender.com` (`mobile/src/config.ts:20`),
  so a GitHub-built APK talks to Render + TiDB Cloud, **not** the local XAMPP DB.
- Probing the live Render backend (health + `/api/auth/login`):
  - `admin@test.com` logs in but the JWT carries **`role:"admin"`** (old pre-RBAC role) →
    the mobile app routes it to Home; no Admin panel.
  - `branchadmin@test.com` → "Invalid email or password" (account does not exist there).
- Conclusion: Render still runs the old seed + old DB. The 7× (branch admin + regional
  vendor) setup only exists on local XAMPP. Getting it onto the phone requires, in order:

## Required steps

1. **Commit + push `main`** — `backend/config/db.js` + `README.md` are modified,
   `plan.md` untracked; Render redeploys from the repo so the new seed must be pushed.
2. **Refresh the cloud DB (TiDB)** — seed only runs when `users` is empty; TiDB has old
   rows. Clear demo rows
   (`DELETE FROM shipments; DELETE FROM user_branches; DELETE FROM vendors; DELETE FROM users;`)
   and let Render reseed on next boot, **or** import a fresh `export-for-tidb.sh` dump.
3. **Version tag → GitHub Release** — `git tag v3.4.2 && git push origin v3.4.2`; the
   `build-apk.yml` workflow attaches `MeroGhar-v3.4.2.apk` to a Release on tags.
4. **Install** — download the APK, allow "install from unknown sources". Render free tier
   sleeps ~15 min idle; first open wakes it in ~1 min.

## Execution now (build mode)

- [x] Regenerate `backend/meroghar-export.sql` from the live XAMPP seed (fresh 16-account
      schema/data) so it can be imported into TiDB.
- [x] Re-verify the dump: restored the new 4-role enum; imported test into a scratch
      database confirmed 16 users / 7 branches / 7 vendors / 14 routes / 7 user_branches.
- [x] Stage + commit (`README.md`, `backend/config/db.js`, `plan.md`) — commit `dcc60ce`.
- [ ] **User action (needs GitHub/Render credentials):**
      `git push origin main` → Render redeploys the new seed; refresh TiDB
      (`DELETE FROM shipments; DELETE FROM user_branches; DELETE FROM vendors; DELETE FROM users;`
      or import `backend/meroghar-export.sql`); then
      `git tag v3.4.2 && git push origin v3.4.2` → GitHub Release APK → install on phone.

---

# Follow-up: zero-rebuild demo via runtime API fallback

Date: 2026-08-13 · **Status: 🟡 planned — not yet implemented**

## Context

- `mobile/src/config.ts:20` hardcodes `PROD_API_URL = 'http://192.168.1.76:5000'` (a LAN IP),
  so the current release APK only works on that network and would need a rebuild at any
  other venue.
- In `__DEV__`, Metro auto-derives the backend host (`config.ts:22-37`) → debug builds need
  no URL edits and work via `adb reverse`.
- Goal: **zero per-venue rebuilds** for the undergrad demo, with uncertain venue internet.

## Decision

Hybrid runtime fallback (one-time code change + one-time rebuild) over a pure LAN/cloud
approach, because internet availability at the venue is unknown.

Verified constraints that make it safe:
- `usesCleartextTraffic="true"` (`AndroidManifest.xml:13`) → LAN `http://` works in release.
- Native app sends no `Origin` → CORS (`server.js:32-45`) and Render both accept it; no
  backend change needed.
- Render + TiDB already configured (`render.yaml`, `backend/scripts/export-for-tidb.sh`).

## Design — API base candidates, tried in order, cached in AsyncStorage

1. `https://meroghar-backend.onrender.com` — cloud; works anywhere with internet.
2. `http://127.0.0.1:5000` — USB + `adb reverse tcp:5000 tcp:5000`.
3. `http://<PC-LAN-IP>:5000` — same WiFi (keep current `192.168.1.76`).

On a network error mid-session: cycle to the next candidate and retry once.

## Change 1 — `mobile/src/config.ts`

- Replace single `PROD_API_URL` with a `PROD_API_URLS: string[]` list (3 candidates).
- Keep `__DEV__` Metro-host resolution untouched.

## Change 2 — `mobile/src/services/api.ts`

- Startup probe: ping each candidate (short timeout ~2–3 s for LAN, longer for the cloud URL
  since Render may be cold-waking); persist the first responder in AsyncStorage and set
  axios `baseURL`.
- Error interceptor: on network failure, clear cache, advance to next candidate, retry once.

## One-time setup

1. Cloud: deploy backend to Render via the blueprint, point env vars at a TiDB Starter
   cluster (`DB_SSL=true`, `SEED_DEMO_DATA=true`); verify `https://meroghar-backend.onrender.com`.
2. Rebuild APK once: `cd mobile/android && ./gradlew assembleRelease` (or push `main` → CI).
3. Verify: `npm run typecheck` + `npm run lint` in `mobile/`; `npm test` in `backend/`;
   device test with internet (Render) and without (USB `adb reverse`).

## Demo day (no rebuilds ever)

- **Internet on:** app auto-uses Render+TiDB. Open the app ~1 min early (cold start).
- **No internet + USB:** `adb reverse` → `127.0.0.1:5000` with local backend.
- **No internet + same WiFi:** local backend on LAN IP.

## Alternative (no code change)

Debug build + `adb reverse` (Option B) — zero rebuilds, zero code edits, but requires USB
at every demo and cannot use the cloud. Rejected as primary due to uncertain internet.

## Files to change

- `mobile/src/config.ts` — candidate list.
- `mobile/src/services/api.ts` — probe + fallback.
- `plan.md` — this section.
- (No backend changes.)

---

# Plan: Booking-by-branch, chat for new bookings, vendor branch change, admin/super work

Date: 2026-08-13 · **Status: ✅ implemented & verified 2026-08-13** (43/43 backend tests pass on
isolated local test DB; mobile typecheck + lint clean; live TiDB E2E verified — customer-selected
and auto-matched bookings assign & approve with **zero admin involvement**)

## Goal

1. **Assign bookings by vendor branch** — the booking form shows the service branch
   (derived from pickup province) and matching/auto-assigned movers are restricted to that
   branch's vendors.
2. **Chat reachable for new bookings** — currently the customer Chat button only renders
   when a mover is already assigned (`MyBookingsScreen.tsx:65`); unassigned (claim-pool)
   bookings show nothing.
3. **Vendor can change their own branch from settings** — free change to any of the 7
   branches, applied immediately (fresh JWT returned because scope is baked in at login).
4. **Admin/super work** — Super Admin can create admin accounts + see whole-Nepal stats;
   branch admins see their region's stats and manage movers there.

## Context (verified in code)

- `createShipment` sets `shipments.branch_id = branchIdForProvince(pickup_province)`
  (`shipmentController.js:178`) but `findMatchingVendors` (`vendorModel.js:208`) ignores
  branch — matches on active + available vehicle + route coverage only.
- `vendors.branch_id` and `shipments.branch_id` already exist → **no table alterations
  needed**; only a data reset to re-seed.
- Vendor scope (`getUserBranches`, `authModel.js:73-79`) is baked into the JWT at login
  (`authController.js:77-83`), so a branch change must return a refreshed token.
- Backend admin support already exists (`/api/org/users` create admin,
  `/api/org/analytics` scoped) — missing mobile UI in `AdminScreen.tsx`.
- TiDB `meroghar_db` is already seeded → drop & re-seed to apply the new setup.

## Changes

### Phase 0 — Reset TiDB data
- Drop `meroghar_db` on TiDB Cloud; restart backend → recreate schema + seed (7 regional
  vendors already carry per-province branches, `db.js:79-138`).

### Phase 1 — Booking-by-branch (backend)
- `findMatchingVendors(vehicleType, route, branchId?)` — add `AND v.branch_id = ?` and
  return `branch_name`.
- `createShipment`: resolve branch once; pass into auto-assign; reject a picked vendor not
  in the booking's branch.
- `matchingVendors` endpoint: accept `branch_id` query param (mobile passes it).
- Claim pool `getAvailableShipmentsForVendor` + `claimShipment`: restrict to the vendor's
  own branch.

### Phase 2 — Chat reachable for new bookings
- `MyBookingsScreen.tsx`: show Chat whenever a mover is assigned; show "searching for a
  mover" status when unassigned.

### Phase 3 — Vendor branch change
- Backend: expose `branch_id`/`branch_name` in `getMyVendorProfile`; add
  `PUT /api/vendor/branch` (validate active branch, update `vendors.branch_id`, return
  fresh JWT).
- Mobile: branch picker in VendorScreen Profile tab; `AuthContext.setSession` to store the
  refreshed token.

### Phase 4 — Admin/super UI (mobile)
- AdminScreen: new "Admins" tab (super only) to create admin accounts; Overview shows
  whole-Nepal + per-branch breakdown for super, region stats for branch admin; Vendors tab
  shows branch.

### Phase 5 — Verify
- Backend tests (`npm test` in `backend/`), mobile typecheck (`npx tsc --noEmit` in
  `mobile/`).

### Phase 6 — Customer selects the mover for their route (no admin)
- **Backend `findMatchingVendors`** (`models/vendorModel.js`): tiered, route-aware matching that
  never needlessly empties. Each result carries `match_tier`:
  - `exact` — covers the exact pickup→drop route (or has no routes: legacy "serves anywhere")
  - `province` — covers pickup→drop at province level but not the exact districts
  - Movers whose declared routes don't span the pickup→drop provinces are excluded (an
    unrelated mover is never offered).
- **`vendorCoversRoute`** relaxed to province-level (or no-routes) so any mover shown in the
  list can be selected or auto-assigned without a spurious 400.
- **No admin in the flow** (verified): `createShipment` auto-approves + assigns when the
  customer picks a valid mover (active, has vehicle, covers route, in booking branch, not
  busy); auto-match assigns the best available mover in the branch; if none, the booking goes
  to the vendor claim pool (vendors self-claim). Admin approve/assign endpoints are gone (404).
- **Mobile `BookingScreen`**: surfaces the real backend message on failure (e.g. "mover is
  busy") with guidance to pick another or use auto-match instead of a generic "Server error";
  mover cards show `match_tier` ("Exact route match" / "Covers your provinces"); auto-match is
  labelled "(recommended)" and is the default; the truly-empty state explains that the booking
  goes to the region's movers (claim pool) with no admin needed.
- **Hardening**: new test "a customer-selected mover is approved and assigned with zero admin
  action"; removed the dead `shipments.approve.region` permission; fixed stale chatbot copy
  ("pick a mover or let admin assign" → "pick a mover or use auto-match", no admin approval).

### Test-suite isolation fix (important)
- The backend test harness spawns a child `server.js` that loads `backend/.env`. With TiDB
  credentials in `.env`, the suite silently ran against the **live `meroghar_db`** on TiDB
  instead of the local `meroghar_test` the harness drops/recreates, causing non-deterministic
  failures (stale data → "mover busy"). Fix in `backend/test/api.test.js`: `spawnBackend`
  pins `MYSQL_DATABASE`/`DB_NAME`/`MYSQLHOST`/`MYSQLPORT`/`MYSQLUSER`/`MYSQLPASSWORD`/`DB_SSL`
  so the child always uses the local test DB (dotenv never overrides set env vars).

## Files to change

- `backend/models/vendorModel.js`, `backend/models/shipmentModel.js`
- `backend/controllers/shipmentController.js`, `backend/controllers/vendorController.js`
- `backend/routes/vendorRoute.js`
- `backend/utils/permissions.js` (removed dead `shipments.approve.region`)
- `backend/controllers/chatbotController.js` (no-admin booking copy)
- `backend/test/api.test.js` (test-DB isolation + no-admin test)
- `mobile/src/services/api.ts`, `mobile/src/context/AuthContext.tsx`
- `mobile/src/screens/BookingScreen.tsx`, `MyBookingsScreen.tsx`, `VendorScreen.tsx`,
  `AdminScreen.tsx`
- `plan.md` — this section

---

# Follow-up: booking-form UX round — distance-based pricing, calendar, no BHK

Date: 2026-08-13 · **Status: ✅ implemented & verified 2026-08-13** (43/43 backend tests,
mobile typecheck + lint clean, live TiDB quote verified & cleaned up)

## Goal

Improve the booking form UX per the customer flow:
1. Remove the BHK/home-size section from step 2 (Items).
2. `move_date` becomes a date input with a calendar at the right; past dates are disabled.
3. Price by distance using the existing OpenRouteService geolocation API (base + per-km),
   shown as the estimated total on the last step.

## Context (verified in code)

- Backend already had an ORS proxy (`GET /api/geocode/search`, `POST /api/geocode/matrix`)
  in `backend/routes/geocodeRoute.js`, but `ORS_API_KEY` was empty → routes 500'd.
- Pricing was flat `DEMO_QUOTE_BY_VEHICLE` (4k/8k/12k); `distance_km`/`estimated_duration`
  were accepted + stored but never sent by the app.
- `home_size` is not required by backend validation → safe to drop from the form.
- Mobile is bare RN (no date-picker/geolocation libs) → custom in-app calendar.

## Changes

### Backend — `shipmentController.js`
- `QUOTE_RATES` + `quoteFor(vehicle, distanceKm)` = base + per-km, rounded to nearest 50.
  Tier B (user-approved): Cargo Tempo 800+30/km, Mini Truck 1000+35/km, Large Truck
  1200+45/km. Flat `DEMO_QUOTE_BY_VEHICLE` stays as the no-distance fallback (keeps the
  suite deterministic; `api.test.js:198` still expects 8000).
- `createShipment`: `final_quote`/`payment_required`/`payment_data.amount` now use
  `quoteFor` when `distance_km` is present; stores the normalized distance.

### `render.yaml`
- Added `ORS_API_KEY` (free-tier key) and `BACKEND_URL=https://meroghar-backend.onrender.com`
  (previously unset → demo payment form would post to `localhost`). DB creds remain
  dashboard-only secrets.

### Mobile
- `utils/pricing.ts` (new): mirrors `QUOTE_RATES`/`quoteFor` so the estimate matches the
  payment amount.
- `services/api.ts`: `GEOCODE.search(text)` + `GEOCODE.matrix(locations)`.
- `BookingScreen.tsx`:
  - BHK chips/`home_size` removed from step 2 (validation + payload).
  - `move_date` is a read-only field with a calendar button on the right → custom month-grid
    modal (pure RN), past days disabled, sets `YYYY-MM-DD`.
  - Debounced (700ms) ORS distance fetch once pickup+drop are complete; builds search text
    `City, District, Province, Nepal`; drives `distanceKm`/`durationMin`.
  - Contact step (last) shows a Booking Summary card: route, distance, est. duration,
    vehicle, total via `quoteFor`. On ORS failure → flat fallback with "mover confirms
    exact distance-based price" note.
  - Submit now sends `distance_km` + `estimated_duration`.
  - Vehicle cards show the distance-based estimate ("for X km") instead of flat rates.

## Verification (2026-08-13)

- Backend `npm test` → **43/43 pass** (tests don't send distance → flat fallback).
- Mobile `npx tsc --noEmit` + `npm run lint` → clean.
- ORS proxy live: `search` returns coords; `matrix` Kathmandu→Pokhara = 198.05 km / ~2.9 hr.
- Live TiDB: Mini Truck booking with `distance_km=198.05` → `final_quote = 7950.00`
  (1000 + 35×198.05 = 7931.75 → round to 50). Test row deleted after.

## Files changed

- `backend/controllers/shipmentController.js` (distance-based `quoteFor`)
- `backend/.env` (gitignored — added `ORS_API_KEY`)
- `render.yaml` (`ORS_API_KEY`, `BACKEND_URL`)
- `mobile/src/utils/pricing.ts` (new)
- `mobile/src/services/api.ts` (`GEOCODE.*`)
- `mobile/src/screens/BookingScreen.tsx` (BHK removal, calendar, distance, summary)
- `plan.md` — this section

---

# Release: v3.4.3 APK (booking-form UX round) via GitHub Actions

Date: 2026-08-13 · **Status: ✅ released** (tag `v3.4.3`, GitHub Release with
`MeroGhar-v3.4.3.apk`)

## Local build (verified before/alongside CI)

- `cd mobile/android && ./gradlew assembleRelease` → **BUILD SUCCESSFUL**
  (`mobile/android/app/build/outputs/apk/release/app-release.apk`, ~60 MB,
  `aapt2` confirms `package=com.meroghar`, `versionCode=12`, `versionName=3.4.3`).
- Same SDK versions as CI (NDK 27.1.12297006, platform android-35, build-tools 35.0.0,
  Gradle 8.11.1 wrapper, JDK 21); release signed with the local `debug.keystore` fallback.

## What it ships (vs v3.4.2, built from `dfc106c`)

- **Customer selects the mover (no admin)**: tiered route-aware matching, auto-approve +
  assign on booking, claim-pool fallback, real error surfacing, "(recommended)" auto-match.
- **Booking-form UX round**: BHK/home-size step removed; `move_date` calendar picker (past
  dates disabled); OpenRouteService distance + duration → distance-based **Tier B** pricing
  (Cargo 800+30/km · Mini 1000+35/km · Large 1200+45/km, round to 50) shown on the last step;
  estimate matches the payment amount.
- **Runtime API fallback** (`PROD_API_URLS`): Render cloud → USB → LAN, cached in
  AsyncStorage.
- Backend fixes: test-suite DB isolation (43/43), `render.yaml` `ORS_API_KEY` + `BACKEND_URL`,
  fresh TiDB reseed (16 accounts / 4-role enum) live on Render.

## How it was built & released

- Version bumped to `3.4.3` (`mobile/package.json`, `mobile/android/app/build.gradle`
  versionCode 12).
- CI workflow `.github/workflows/build-apk.yml` (build on `main` pushes; build + GitHub
  Release on `v*` tags) produced the release: `assembleRelease` signed with the CI-generated
  `debug.keystore`, APK uploaded as `MeroGhar-v3.4.3.apk`.
- `git push origin main` (commit `bafde1e` + version bump), then `git tag v3.4.3` + push.

## Verification

- APK config points at `https://meroghar-backend.onrender.com` (first `PROD_API_URLS` entry),
  now live with fresh seed + ORS key (geocode/matrix returns real distances).
- Release page confirmed the `MeroGhar-v3.4.3.apk` asset is public.

## Files changed

- `mobile/package.json`, `mobile/android/app/build.gradle` (version 3.4.3)
- `plan.md` — this section