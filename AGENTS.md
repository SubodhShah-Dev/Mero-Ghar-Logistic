## Goal
- Ship MeroGhar logistics web app as an Android APK; redesign UI for mobile-first Android experience.

## Constraints & Preferences
- Android 7.0+ (minSdk 24) compatibility.
- API URL auto-detects environment (web dev, emulator, production).
- Backend hosted free-tier on Railway.
- APK distributed via GitHub Releases (repo renamed to `Mero-Ghar-Logistic`).
- In-app update check + download via `@capacitor/filesystem` + `@capacitor/share`.
- UI must look like a native Android app, not a desktop website shrunk onto a phone.

## Progress
### Done
- Full project structure explored (Vite + vanilla JS frontend, Express + MySQL backend).
- Capacitor installed; Android platform added; `capacitor.config.json` configured.
- `src/js/config.js` centralizing API URL created; all HTML/JS pages updated.
- Tailwind config content pattern fixed.
- JDK 21 (Temurin) and Android SDK command-line tools installed.
- Debug APK built and uploaded to GitHub Releases (v1.0.0).
- Backend deployed to Railway (`https://backend-production-d51a3.up.railway.app`).
- MySQL database provisioned on Railway; `schema.sql` imported.
- `copy-pages.mjs` added to copy pages, JS, styles, and compiled CSS into `dist/`.
- All admin/vendor/user/login/signup pages made responsive (collapsible sidebars, stacked grids, larger checkboxes, bigger inputs).
- App icon generated via Python/Pillow (multiple iterations: truck+mtns → truck+home → final minimal flat M).
- Hamburger menu fixed (`toggleMenu()` exposed on `window`).
- guard.js paths fixed from `/login.html` → `/src/pages/login.html`.
- Signup/admin/schema bugs fixed (admin role removed, phone `type="tel"`, 18 missing columns added via ALTER TABLE).
- Navbar transparency fixed (`bg-forest-900/96 backdrop-blur` → solid `bg-forest-900 shadow-lg`).
- v1.2.0: step labels truncated, item chips `grid-cols-2` on mobile, terms checkbox larger, backdrop-filter removed.
- v1.3.0: full UI audit — `touch-action: manipulation`, `--dim` 0.28→0.45, touch targets 44px min, `<button>` modals, `<label>` elements, contrast fixes.
- v1.4.0: mobile menu full-width with own `bg-forest-900`, form buttons `py-3.5`→`py-3`, panel 5 `flex-wrap` removed.
- v1.4.1: in-app update check added (GitHub API → modal dialog).
- v1.5.0: in-app APK download via `@capacitor/filesystem` + `@capacitor/share` (fetch → cache → share intent).
- v1.6.0: redesigned icon (visble mountains, bold truck, home icon, Nepal flag badge).
- v1.7.0: simplified icon to flat saffron M on forest green (like Facebook).
- README.md updated with v1.7.0 details, new repo name, icon docs, update system docs.
- Repo renamed to `SubodhShah-Dev/Mero-Ghar-Logistic`; all git remotes, config.js `GITHUB_REPO`, and README URLs updated.
- v1.8.0: Mobile-first UI redesign — all `text-[10px]`/`text-[11px]` → `text-xs`, `py-24` → `py-16`, `min-h-[44px]` on all buttons, item chip `px-2` → `px-3`, province tags enlarged, admin modal input padding bumped.
- v1.8.1: Fix payment processing (replaced HTML injection with native payment overlay), fix "How Did You Find Us?" dropdown (`[1]`→`[0]`), harden map rendering (Leaflet check, try-catch, sessionStorage fallback).
- **Comprehensive full-codebase audit & bug fix session (v1.9.0 prep):**
  - CRITICAL fixes: Added `<!doctype html>` + `lang="en"` to user.html; fixed wrong terms checkbox selector (was saving Phone Call state as `termsAccepted`); replaced unsafe `JSON.parse(localStorage.getItem(...))` with `safeParse()` helper across all JS files; fixed `admin.js submitBooking()` to POST to `/api/shipment/create`; fixed `var(--bdim)` → `var(--border-dim)` in admin.css; removed `backdrop-filter: blur(3px)` from vendor.css; added `pickup_address`/`drop_address` to shipment INSERT query in backend; fixed XSS in dummy payment form (HTML-escaped user fields).
  - HIGH fixes: Added null-safety guards to `onProvinceChange`, `getPickupAddressString`, `getDropAddressString`, `toggleOnline()`; fixed NaN fallback distance (`parseInt("")` → NaN); fixed Step 2 validation (was always `() => true`); added `connectips`/`banktransfer` payment method mapping; fixed mobile validation to require exactly 10 digits; added missing `saffron-50`/`saffron-200` to tailwind config; replaced all `alert()` calls in auth.js/guard.js with `showToast()`; added null checks in main.js (`#navbar`, `#mobileMenu`, FAQ elements); fixed vendor toggle knob 4px jump (translateX → left/right positioning).
  - Build/Meta: bumped `package.json` from `0.0.0` → `1.9.0`; bumped `APP_VERSION` in config.js to `1.9.0`; added reusable `showToast()` function to config.js.
  - Full list of 33+ bugs found during audit: [audit details remain stable].
- v1.9.1: XSS protection (escapeHtml in admin.js/vendor.js), vendor.js null safety (34 fixes), vendor.html CDN→Vite pipeline, admin.js filter ordering fix, APK built & released.
- v2.0.0: AI Chatbot (MeroBot) — floating widget bottom-left on all pages, Gemini 1.5 Flash backend with rule-based fallback, no external deps.

### In Progress
- (nothing)

### Blocked
- (none)

## Key Decisions
- **Capacitor over PWA or Flutter** — kept existing web codebase, minimal rewrite, native Android APK output.
- **Railway over Render** — user preference; free Node.js hosting + free MySQL (500 MB).
- **GitHub Releases for distribution** — standard APK hosting without Play Store; direct download URL.
- **`touch-action: manipulation` globally** — eliminates 300ms tap delay in Android WebView.
- **`@capacitor/filesystem` + `@capacitor/share` for updates** — downloads APK bytes in-app via fetch, saves to cache, shares file to trigger Android package installer.
- **Flat M icon design** — user rejected detailed truck/mountain icons; simple letter-on-background approach (like Facebook).

## Next Steps
- (none — all items from previous session completed in v1.9.1)

## Critical Context
- **Latest APK:** `https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases/download/v2.0.0/MeroGhar-v2.0.0.apk`
- **Backend live:** `https://backend-production-d51a3.up.railway.app`
- **Build:** `npm run build && npx cap sync android` then `JAVA_HOME=/home/subodh/jdk21 ./gradlew assembleDebug` from `android/` dir.
- **Remote:** `https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic.git` (formerly `Mero-Ghar-Logistics-Website`).
- **MySQL:** Railway internal `mysql.railway.internal:3306`, proxy `thomas.proxy.rlwy.net:18704` (user `root`, database `railway`).

## Relevant Files
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/generate-icons.py`: App icon generator (Pillow) — current design is flat saffron M on forest green.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/js/config.js`: Central API URL, `APP_VERSION` (now `2.0.0`), `GITHUB_REPO`, `safeParse()`, `showToast()`, in-app update check + download logic.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/js/chatbot.js`: AI Chatbot widget (MeroBot) — self-contained, no deps, appears on all pages.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/backend/controllers/chatbotController.js`: Gemini API proxy + rule-based fallback.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/backend/routes/chatbotRoute.js`: `POST /api/chatbot/message`.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/pages/user.html`: Multi-step booking form — main mobile UI target.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/pages/admin.html`: Admin panel with tables, stats, modals.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/pages/vendor.html`: Vendor portal with fleet, jobs, modals.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/style.css`: Global styles (`.s-circle`, `.item-chip`, `.v-card`, `.pay-card`).
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/styles/admin.css`: `.tw` table, stats grid, sidebar.
- `/home/subodh/workspace/Mero-Ghar-Logistics-Website/src/styles/vendor.css`: `.sb` sidebar, toggle styles.
