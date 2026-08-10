# MeroGhar — Web Frontend

Vite + React 19 + TypeScript + Tailwind CSS SPA for the MeroGhar logistics marketplace (see the [root README](../README.md)).

## Run

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm install
npm run dev            # http://localhost:5173
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build into `dist/` |
| `npm run lint` | Oxlint |
| `npm run preview` | Preview the production build |

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://meroghar-backend.onrender.com` | Backend base URL (set to `http://localhost:5000` in dev) |

## Structure

```
src/
├── pages/          Landing, Booking (5-step), Login, Signup, My Bookings, Admin, Vendor, 404
├── components/     Navbar, Footer, MeroBot, ProtectedRoute/RoleRoute, UpdateDialog, ErrorBoundary, GoToTop
├── context/        AuthContext (JWT in localStorage), ToastContext
├── services/api.ts Single Axios client with auth interceptor + typed endpoint groups
├── types/          Domain models
└── utils/          Nepal province/district data, helpers
```

Featuring the **demo payment overlay**: after a non-cash booking is created, the user completes the in-app demo payment form, which calls the backend demo gateway and marks the booking `paid` while it stays `pending` for admin/vendor scheduling.