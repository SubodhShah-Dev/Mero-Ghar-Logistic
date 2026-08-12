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

Date: 2026-08-12 · **Status: ⏳ in progress**

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
- [ ] Re-verify the dump: should contain the new 4-role enum, 16 users, 7 branches/vendors.
- [ ] Stage + commit (`README.md`, `backend/config/db.js`, `plan.md`).
- [ ] Hand off the exact `git push origin main` + tag commands (push needs user's GitHub
      credentials; not done from here).