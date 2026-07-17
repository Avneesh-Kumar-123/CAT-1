---
name: Auth & Cloud Save setup
description: Better Auth + Neon DB + Vite proxy wiring decisions and gotchas for the Cat Chase account system.
---

# Auth & Cloud Save setup

## Architecture
- **Better Auth** handles email+password + Google OAuth. Config in `artifacts/api-server/src/lib/auth.ts`.
- **Neon PostgreSQL** — connection via `DATABASE_URL` secret. Tables: `authUser`, `authSession`, `authAccount`, `authVerification`, `cloud_saves`, `item_catalog`, `inventory_items`.
- **DB schema**: `lib/db/src/schema/`. Push with `pnpm --filter @workspace/db run push`.
- **Vite proxy**: `/api → http://localhost:${API_PORT ?? 8080}` in `artifacts/cat-chase/vite.config.ts`. Keeps browser on one origin so auth cookies work with no CORS hassle.

## Key env vars (all stored as Replit Secrets)
- `DATABASE_URL` — Neon connection string
- `BETTER_AUTH_SECRET` — token signing key
- `BETTER_AUTH_URL` — `http://localhost:5000` (frontend URL; Better Auth builds OAuth redirects from this)
- `TRUSTED_ORIGINS` — `http://localhost:5000,http://localhost:5173`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional Google OAuth
- `API_PORT` — `8080` (non-secret env var); Vite proxy reads this

## Gotchas fixed
- **React duplicate hook error** (`useRef` null in better-auth/react): Fixed by adding `better-auth` to `resolve.dedupe` AND `optimizeDeps.include: ["better-auth/react"]` in vite.config.ts.
- **`@opentelemetry/*` external**: Was in `build.mjs` external list but not installed — removed from list so esbuild bundles it inline.
- **DB module lazy init**: `lib/db/src/index.ts` uses a Proxy so the Pool is only created when first accessed. API server can start without `DATABASE_URL` (routes fail gracefully instead of crashing on boot).
- **API server port**: Runs on 8080 (Replit artifact system sets this). Vite proxy target uses `API_PORT` env var.

## Frontend wiring
- `src/lib/auth-client.ts` — `createAuthClient({ baseURL: VITE_API_BASE_URL ?? "" })`
- `src/contexts/AuthContext.tsx` — `AuthProvider` with session, merge-on-login, debounced sync
- `src/components/AccountModal.tsx` — sign-in/sign-up/account management UI
- `src/pages/Splash.tsx` — AccountButton + AccountModal wired in; badge toggles between "No login" and "☁️ Signed in"

**Why:** Keeping baseURL empty means all auth fetches go to the same origin, letting Vite proxy them — zero cross-origin cookie issues in dev.
