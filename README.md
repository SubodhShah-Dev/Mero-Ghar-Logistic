# MeroGhar - Nepal's Trusted Household Movers

Full-stack logistics platform (Vite + Tailwind + vanilla JS, Express + MySQL, Android via Capacitor).

## Download APK

[**Download MeroGhar v2.3.2 APK**](https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases/latest/download/MeroGhar-v2.3.2.apk)

## Changelog

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
npm run build && npx cap sync android
JAVA_HOME=/path/to/jdk21 ./gradlew assembleDebug   # from android/
```

APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

All releases: https://github.com/SubodhShah-Dev/Mero-Ghar-Logistic/releases

Private
