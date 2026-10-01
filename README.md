# MWG Franchise Sales App

Restricted workspace for the Mr. White Gloves franchise sales team (sales executives, sales managers, admin / CEO).
Same backend (`backend2`, `/api/franchise-sales/*` + Socket.IO `/sales`), same design system as the MWG admin dashboard.

Build plan, architecture and test guide: `app_admin_panel/docs/franchise-sales-app/`.

## Stack

Vite 7 · React 19 · shadcn/ui (new-york, copied from `admin_dashboard`) · Tailwind 3 · Redux Toolkit + RTK Query
(server state only in `src/app/api.js`) · react-router 7 (lazy routes) · socket.io-client (one connection per tab,
`src/app/SocketProvider.jsx`) · react-hook-form + zod · TanStack Table · date-fns · sonner.

## Run locally

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:5174 — talks to http://localhost:5000/api (.env.development)
npm run build        # production build, uses .env.production (api.mrwhitegloves.com + Cloud Run socket URL)
```

Sign in with an AdminUser that has the Franchise Sales App (role Sales Executive / Sales Manager, an employee with
"Also use the Sales App", or the super admin). Accounts are managed in the admin dashboard → Admin Users.

## Deploy (Vercel)

- Framework preset: Vite · build `npm run build` · output `dist` · install `npm install --legacy-peer-deps`
- `.env.production` is committed (public URLs only) — no Vercel env vars are needed
- Domain: `sales.mrwhitegloves.com` (CNAME at the DNS provider, value shown by Vercel)
- `vercel.json`: SPA rewrite + basic security headers

## Rules

- Never call admin APIs from here — the backend refuses Sales App tokens outside `/api/franchise-sales/*`.
- Every list / record comes from the API already scoped to the user (own / team / all); the UI only hides what the
  API would refuse anyway.
- No personal WhatsApp anywhere: chats go through the central MWG number (FS06).
