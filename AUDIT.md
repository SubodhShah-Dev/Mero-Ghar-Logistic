# ShiftSathi-React — Project Audit Report

- Audit date: 2026-08-12
- Scope: `backend/` (Express 5 + MySQL), `mobile/` (React Native 0.79/TS), `.github/`
- Tools run: `npm test` (backend), `tsc --noEmit` + `eslint` (mobile), `npm audit`, `npm outdated`, git/secret scans

**Baseline:** backend 42/42 tests pass; mobile typecheck now clean after fixes; mobile lint clean; backend `npm audit` = 0 vulns; mobile `npm audit` = 10 high (dev-tooling only).

> Status icons: 🔴 fixed this session · ⚠️ open · 💡 advisory

---

## 🚨 Critical

**C1 · Admin portal is unreachable in the app (role-name mismatch) — 🔴 FIXED**
The backend roles are `user | vendor | branch_admin | super_admin` (`backend/utils/permissions.js:9`), but the mobile UI compares/gates against a role literally called `'admin'`, which does not exist:
- `mobile/src/App.tsx:48` and `:55` passed `role="admin"` to `<RoleGuard>`, whose prop is `roles`. Type errors (`TS2322`) — and at runtime `allowed.includes('admin')` is never true, so `super_admin`/`branch_admin` were redirected back to Home. `AdminScreen` could not be opened at all.
- `mobile/src/screens/HomeScreen.tsx:39,41,70` compared `user.role === 'admin'` — `TS2367` "no overlap", and the Admin buttons never rendered.
- `mobile/src/screens/LoginScreen.tsx:18-19` mapped only `'admin'` → Admin, so `super_admin`/`branch_admin` logins landed on Home.

Fix applied: use `roles={['super_admin','branch_admin']}` and the existing `isAdminRole()` helper (`mobile/src/utils/roles.ts`). Verified with `tsc --noEmit` (clean) and `eslint` (clean).

**C2 · Default/fallback JWT secret in code — 🔴 FIXED (fail-fast added)**
`JWT_SECRET` falls back to the hard-coded string `'shiftsathi-jwt-secret-change-in-production'` in `backend/controllers/authController.js:13` and `backend/middleware/auth.js:4`. Any deployment that forgets `.env` (or where the env key is lost after the now-deleted `render.yaml`) runs with a public, forgeable signing key — full account impersonation.
Fix applied: when `NODE_ENV === 'production'` and `JWT_SECRET` is unset, the process refuses to start (`console.error` + `process.exit(1)`). Dev fallback unchanged. Syntax-checked and backend suite re-run (42/42).

**C3 · Mobile typecheck currently failing — 🔴 RESOLVED (see C1)**
5 compile errors (`TS2322` ×2, `TS2367` ×3). Now `npm run typecheck` exits 0. Long-term: add mobile typecheck/lint to CI (`.github/workflows/build-apk.yml` only builds the APK today).

---

## ⚠️ Warnings

**W1 · Uncommitted destructive changes in the working tree**
`git status` shows the entire `frontend/` app and `render.yaml` deleted (still tracked in HEAD), alongside 30+ modified files and new org-branch files. This is 8,713 deleted lines in an **unstaged** state. If `git add -A && git commit` happens by accident before the refactor is intentional, history is not lost (it's in HEAD) but the tree is easy to miscommit. Decide and commit/purge deliberately:
```bash
git add -A
git commit -m "chore: drop web frontend, move to mobile-only"   # after confirming intent
```

**W2 · `mobile/package-lock.json` has 10 high-severity advisories (dev tooling)**
`brace-expansion`, `image-size` (via `metro`/`@react-native/community-cli-plugin`), `js-yaml`, `nanoid`. All live in the React Native/Metro toolchain — **do not** run `npm audit fix --force` (it downgrades to react-native 0.72, a breaking change per the audit output). Remediate the safe subset only:
```bash
cd mobile && npm audit fix        # applies non-breaking fixes (js-yaml, nanoid, brace-expansion)
npm outdated                       # review the rest by hand
```
A `npm audit fix` dry-check earlier showed image-size forces the RN downgrade — keep metro-derived vulns as accepted risk or wait for RN 0.79.x patch.

**W3 · `GET /api/vendor/matching` is unauthenticated** — `backend/routes/vendorRoute.js:46`
Used by customers before login, returns only public fields (`id, business_name, service_region, rating, total_jobs`, `vendorModel.js:216`). Not a data leak today, but it is a deliberate unauthenticated route on an authenticated router. Add `optionalAuth` for consistency and review again when more fields are added:
```bash
# In vendorRoute.js:
# router.get('/matching', optionalAuth, matchingVendors);
```

**W4 · Model layer silently swallows DB errors**
`backend/models/*.js` wrap queries in `try/catch` and return `[]`, `false`, or `null` (e.g. `vendorModel.js:23`, `getAllVendors`). Controllers then report "not found" instead of "database down", masking outages as empty data.
Recommendation: rethrow or return a sentinel; let `asyncHandler` → global error handler surface `500`.

**W5 · Demo payment logs the "password" to server logs** — `backend/services/dummyPaymentService.js:755`
```bash
# Redact before any shared logging pipeline:
# console.log('Dummy payment received:', { ...paymentData, password: '***' });
```

**W6 · `mobile/android/app/debug.keystore` is committed to git**
Deliberate `.gitignore` exception (`!debug.keystore`, `.gitignore:10`) but it is still a secret-like artifact with the well-known `android` keystore password. Acceptable for a student demo; remove from VCS if the repo ever goes public beyond the classroom.

**W7 · Docs are stale vs the current role model**
`README.md:130` documents JWT roles as `user/vendor/admin`; `.env.example` + code have 4 roles (`branch_admin`, `super_admin`). The README demo script ("Admin → Approve + assign") is also outdated — tests confirm admin approval/assignment was removed in favor of route-aware auto-matching (`backend/test/api.test.js`).

---

## 💡 Recommendations

**Dependencies**
- Backend minor bumps (safe): `dotenv 17.4.1 → Node 22's `dotenv` 17.4.2`, `express-rate-limit 8.6.1 → 8.6.2`, `mysql2 3.23.2 → 3.23.3` → `cd backend && npm update`
- Mobile: skip the majors in `npm outdated` (Babel 8, ESLint 10, RN 0.87, TS 7, react 19.2) — RN version coupling makes strict-pinning to `0.79.2`/`react 19.0.0` the right call for this app. Consider `react-native-screens 4.18 → 4.27` (patch-level) when convenient.
- No missing peer deps flagged by `npm ls`.

**Config / Env**
- Backend `.env.example` exists and is current. Add a root `.env.example`? Not needed — mobile derives config from `config.ts`, backend seeds from its own template.
- Consider `helmet` + a global rate limiter beyond `/api/auth` (currently only `server.js:50` guards auth). `cors` allowlist is appropriately locked to localhost.

**Performance**
- `ChatScreen.tsx:45` polls `GET /shipment/:id/messages` every 5s. Fine for demo; switch to a push/websocket or `useFocusEffect`-gated polling before scaling.
- `AdminScreen`/`VendorScreen` fan out 3–6 parallel calls per load with no cursor/offset — paginate `/api/shipment/all`, `/api/admin/vendors`, `/api/vendor/shipments` (models already accept `page/limit`).
- `findMatchingVendors` (`vendorModel.js:215`) uses correlated `EXISTS` subqueries per vendor; add an index note: `vendor_routes(vendor_id, is_active, from_province, to_province)` would help at larger volumes.
- DB pool `connectionLimit: 10` is fine at this scale.

**Code quality**
- `any` is used liberally in screens (`AdminScreen`, `VendorScreen`, …) and the `no-explicit-any` lint rule is disabled (`eslint.config.js:17`). Introduce `Shipment`/`Vendor`/`Vehicle` types in a shared `src/types.ts`.
- Duplicated `UserRole` type — fixed this session by importing from `mobile/src/utils/roles.ts` (single source).
- Dead code confirmed by grep scan (no callers):
  - `backend/services/dummyPaymentService.js:2` `initiateDummyPayment` (the ~730-line payment HTML page — used only by the deleted web frontend; not the mobile flow)
  - `backend/models/vendorModel.js:137` `updateVendorRating`
  - `mobile/src/utils/roles.ts:35,45` `hasPermission` / `getBranchIds` are unused by any screen
- `RoleGuard.tsx:15` rebuilds the `allowed` array every render and uses it in `useEffect` deps — the effect re-runs each render. Memoize or move the check into the effect body.

**CI / Tests**
- Mobile has no unit tests; add `typecheck` + `lint` as required steps in `.github/workflows/build-apk.yml` (they are fast and would have caught C1/C3 on the last push).
- Backend tests require a running XAMPP MySQL — add a `mysql` service container to a CI job so `npm test` runs on every push (`mysql:8`, env `MYSQL_ROOT_PASSWORD`, then `npm test`).

---

## Suggested remediation commands (summary)

```bash
# 1. Safe dependency bumps + advisory fixes
cd backend && npm update
cd mobile && npm audit fix            # NOT --force

# 2. Secrets / hard-coded defaults
#    Already fail-fast in production (C2). In real deployment:
#    export JWT_SECRET="$(openssl rand -hex 32)"

# 3. Resolve uncommitted refactor intent
git add -A && git commit -m "chore: drop web frontend, retire admin approval flow"

# 4. CI coverage
#    add to .github/workflows/build-apk.yml:
#      - name: Typecheck mobile
#        run: npm run typecheck
#        working-directory: mobile
#      - name: Lint mobile
#        run: npm run lint
#        working-directory: mobile
```