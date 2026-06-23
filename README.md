# MeroGhar - Nepal's Trusted Household Movers

Full-stack logistics platform (Vite + Tailwind + vanilla JS, Express + MySQL, Android via Capacitor).

## Download APK

[**Download MeroGhar v2.6.1 APK**](https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases/latest/download/MeroGhar-v2.6.1.apk)

## Changelog

### v2.6.1 — Fast & Reliable In-App Update Download
- **Fixed: update download** — replaced streaming (`ReadableStream`) with blob-based download for wider Android WebView compatibility
- **45-second timeout** via `AbortController` — no more hanging forever on slow networks
- **Direct package installer** — uses `window.open(uri, '_system')` instead of `Share.share()` — skips the share sheet hop, installs directly
- **GitHub API caching** — latest version cached in localStorage with 2-hour TTL; API not hit on every page load (saves bandwidth, avoids rate limits)
- **Browser fallback** — when in-app download fails, "Download in Browser" button opens Android's native DownloadManager

### v2.6.0 — All-Questions Chatbot + Bug Fixes
- **📋 All Questions Button** — tap the new "📋 All Questions" chip in the chatbot to see ALL 70+ questions you can ask, organized into 14 categories (About, Booking, Pricing, Vehicles, Coverage, Payment, Tracking, Services, Items & Care, Cancellation, Support, Reviews, How It Works, Insurance). Each question is a tappable chip
- **Comprehensive Help** — typing "help" now shows every category with example questions (frontend + backend)
- **Bug Fix: Hero login persistence** — login button in the hero CTA section now also gets replaced with Dashboard link after login
- **Bug Fix: Chatbot ignorance** — asking "What is the purpose of this site?" returns proper site description
- **Bug Fix: Payment processing** — `initiateDummyPayment()` now returns all required fields (amount, transaction_uuid, order_id, customer info) so the payment overlay hidden inputs are populated correctly
- **Bug Fix: My Bookings cramped** — topbar button padding increased (4×8 → 8×12), font-size 12→13, added `white-space:nowrap`

### v2.5.0 — Knowledge-Backed MeroBot Chatbot
- **Knowledge-Backed Answers** — MeroBot now searches the entire site content (all 7 HTML pages) to answer questions instead of using hardcoded replies. Extracts 161 searchable knowledge chunks covering FAQ, services, provinces, vehicle types, booking steps, reviews, and more
- **Topic-Specific Direct Responses** — instant answers for 15+ topics: booking instructions, pricing ranges, vehicle types, province coverage, payment methods, fragile/religious item handling, auspicious timing, add-on services, customer reviews, contact info
- **Offline Fallback** — `src/js/chatbot.js` embeds a compressed knowledge base so the bot answers site questions even without network connectivity
- **Gemini Integration Enhanced** — backend injects relevant site context into Gemini 1.5 Flash prompts for more accurate AI answers
- **Build Tooling** — `npm run build:knowledge` regenerates the knowledge base from HTML; `npm run build:all` runs knowledge + Vite + pages in one command
- **New files:** `scripts/build-knowledge.mjs`, `backend/utils/knowledgeSearch.js`, `backend/knowledge-base.json`

### v2.4.0 — Marketplace model: customers pick vendors directly
- **Marketplace flow** — booking form now includes a **Mover Selection** step (fp4) after vehicle type: matching vendors (by vehicle type + province) are fetched from the API and displayed as radio cards; customer picks their mover directly
- **Admin removed from vendor assignment** — approval table no longer has a vendor dropdown or Approve button; admin can only reject bookings. Vendors assigned directly by customers are auto-approved in the DB
- **Vendor vehicles CRUD** — `vendor_vehicles` DB table replaces localStorage; vendor portal fleet management now uses backend API (add/edit/remove vehicles persistently)
- **My Bookings page** — new `/src/pages/my-bookings.html` shows logged-in users all their bookings with status and assigned vendor; accessible from topbar and mobile menu
- **Matching API** — `GET /api/vendor/matching?vehicle_type=...&pickup_province=...&drop_province=...` returns active vendors with compatible vehicles
- **Bug fixes**: `pNw` pill style added to admin.css (was only in vendor.css), admin approval table colspan fixed

### v2.3.2 — Fixed forward/back navigation in multi-step form
- **popstate handler** `src/js/user.js`: Now reads `event.state.step` to determine target step — properly supports both **back** and **forward** Android buttons; no longer pushes extra states into history
- Removed unbounded history growth on each back press

### v2.3.1 — Login detection fix for Android WebView + step 5 vertical layout
- **Login button fix** `src/js/session-ui.js`: Removed `e.persisted` guard on `pageshow` — now fires on every page show (Android WebView wasn't triggering bfcache); added `DOMContentLoaded` safety net
- **Step 5 contact fields** `src/pages/user.html`: Changed grid to `grid-cols-1` so First Name, Last Name, Mobile, Alt Mobile, Email stack vertically on all screen sizes

### v2.3.0 — Session-aware UI fixes + Android back button handling
- **Session-aware login detection** `src/js/session-ui.js`: Replaced native `confirm()` with a styled logout modal; added `pageshow` event listener so login→Dashboard replacement re-applies on back/forward cache restore
- **Android back button** `src/js/user.js`: Added `history.pushState()` on forward form steps + `popstate` listener — pressing back on steps 2–5 goes to previous step instead of exiting the app

### v2.2.0 — Chatbot action system + comprehensive audit fixes
- **MeroBot action system** `src/js/chatbot.js`:
  - Added `ACTIONS` array with 6 intents — book, track, login, signup, admin, vendor
  - `matchAction()` detects user intent before API call; `validateAction()` checks auth/role
  - Non-auth actions redirect immediately; auth-gated actions require matching role, show error if not
- **Quick-action chips** — 6 tappable pills (Book, Track, Pricing, Payments, Login, Help) shown on chat open
- **Help command** — structured capabilities list for `help` / `commands` / `what can you do`
- Same help handler added to backend fallback for consistency
- **Security fixes**: XSS fixed in all 3 toast() functions (config.js, admin.js, vendor.js) — replaced `innerHTML` with `createTextNode`; unsafe `JSON.parse()` replaced with `safeParse()` everywhere; 20+ PII-leaking `console.log` statements removed from auth.js
- **UX improvements**: All 16 `alert()` calls in `user.js` step validators replaced with `showToast()`; 11 form inputs now have `id` attributes (no more fragile index-based selectors); mobile `pattern="[0-9]{10}"` validation on phone inputs; slideIn animation fixed (was silently broken); `min-h-[44px]` touch targets on all mobile buttons/inputs
- **CSS cleanup**: `--bdim` → `--border-dim` consistency in vendor.css; `backdrop-blur` removed from vendor modal (Android perf); `py-3.5` replaced with `py-3 min-h-[44px]` everywhere; `scrollbar-width: thin` for Firefox
- **Accessibility**: Favicon on all pages; `aria-label` on admin/vendor hamburger buttons; `required` attributes on modal/vendor forms; signup radio `id` + `for` associations

### v2.1.0 — Multistep form layout & chatbot state fixes
- **MeroBot AI Chatbot** `src/js/chatbot.js`:
  - Added `renderChatHistory()` — restores conversation on panel reopen so users see their full chat history across open/close cycles
  - `chatHistory` now resets on panel close — prevents invisible ghost context confusing the AI
  - Error response handling now shows server error messages via `data.message` fallback
- **Step 1 layout** `src/pages/user.html`:
  - Pickup and Drop grids changed from `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` so inputs stack vertically on mobile instead of being squished
  - Province and Lane Access updated to `col-span-1 sm:col-span-2` to match
- **Step 5 overlap** `src/pages/user.html`:
  - Both phone input containers (Mobile + Alternate) now have `min-w-[160px]` to prevent the `+977` prefix from over-shrinking the input at narrow viewport widths

### v2.0.0 — AI Chatbot (MeroBot)
- **MeroBot AI Chatbot** — floating Gemini-powered assistant built from scratch (zero dependencies), injected on every page
- **Session-aware UI** — landing page topbar now detects login state; shows "Dashboard" button for authenticated users instead of "Login"

### v1.9.0 — Comprehensive bug fix release
- 33+ issues resolved across full stack (see AGENTS.md for full list)
- CRITICAL: terms checkbox, booking API, address data loss, XSS, CSS crashes, JSON.parse safety
- HIGH: null-safety, NaN pricing, step validation, payment methods, auth alerts → toasts
- package.json: `0.0.0` → `1.9.0`

### v1.8.1
- Payment processing fixed (HTML injection → native overlay)
- "How Did You Find Us?" dropdown index fixed
- Map rendering hardened with try-catch + sessionStorage fallback

### v1.8.0 — Mobile-first UI redesign
- All `text-[10px]`/`text-[11px]` → `text-xs`, `py-24` → `py-16`
- `min-h-[44px]` touch targets everywhere, item chip padding enlarged

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
npm run build:all   # regenerates knowledge base + builds Vite + copies pages
npx cap sync android
JAVA_HOME=/path/to/jdk21 ./gradlew assembleDebug   # from android/
```

APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

All releases: https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases

Private
