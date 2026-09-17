# AGENTS.md

## Stack

- Next.js 16 App Router + React 19, Tailwind v4 (via `@tailwindcss/postcss`), TypeScript strict. Path alias `@/*` → `src/*`.
- Firebase client SDK for Auth + Firestore. No server-side Firebase Admin — everything runs as the signed-in user.
- Image uploads go to Cloudflare R2 via `POST /api/upload` (`src/app/api/upload/route.ts`); requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`. Uploads are authenticated with the user's Firebase ID token.

## Commands

- npm only (package-lock.json is committed; no lockfile for other package managers).
- Dev: `npm run dev`. Verify changes with `npm run lint` and `npm run build` (there is no test suite).
- Seed Firestore from `src/lib/mock-data.ts`: `npm run seed`. Idempotent — overwrites by fixed doc ids. Requires `ADMIN_PASSWORD` (or `FIREBASE_SERVICE_ACCOUNT_B64`) in `.env` to authenticate against Firestore security rules.
- Create super-admin account: `npm run bootstrap:admin`.
- Verify R2 uploads: `npm run upload:healthcheck`.

Scripts run plain Node directly on `.ts` files (`node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/*.ts`) — requires a Node version with native TS type-stripping support. They read `.env` and/or `.env.local`. `tsconfig.json` excludes `scripts/`, so typecheck/lint don't cover them.

## Architecture

- `src/lib/data.ts` reads live Firestore collections seeded by `npm run seed`; `src/lib/mock-data.ts` is the source dataset.
- Access control lives in `firestore.rules`: roles on each user doc are `super_admin`, `admin` (platform staff), `restaurant` (scoped to own `restaurantId`). Client mirrors this in `src/lib/user.ts` / `src/lib/adminSecurity.ts` (admin passkeys, IP allowlist enforcement toggle).
- Routes: two hosts, one deployment, split by `src/proxy.ts` (Next 16 proxy convention, not middleware.ts): `cravely.space`/`www` → landing page (`src/app/(marketing)/` — `/landing` rewritten to serve `/`, plus `/privacy`, `/terms`), `app.cravely.space` → consumer app (`src/app/(app)/` — home, restaurants, search, product, liked, maps, packages, profile, console pages). API routes exist: `/api/health`, `/api/my-ip`, `/api/push`, `/api/upload`. Canonical origin for app metadata is `https://app.cravely.space` (`metadataBase` in `src/app/layout.tsx`; override hosts via `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_LANDING_URL`).
- Maps: CARTO Voyager tiles with OpenStreetMap attribution (`src/lib/mapTiles.ts`), authenticated via `NEXT_PUBLIC_CARTO_API_KEY` using `?key=` query param across all Leaflet maps (`LocationMap`, `RestaurantsMap`, `LocationSetter`).
- Versioning: `APP_VERSION` in `src/lib/site.ts` imports version from `package.json` and renders in app, marketing, and profile footers.
- Deployed on Vercel; `vercel.json` 308-redirects `cravely-prod.vercel.app` and `cravely.zone.id` to `app.cravely.space`. If adding auth domains or new hosting domains, update `firebase.json` authorizedDomains and deploy rules/indexes via Firebase CLI.

## Conventions

- `.agents/` contains vendored agent skills — eslint ignores it entirely; do not treat it as app code.
- Env files are gitignored (`.env*`). Always keep `AGENTS.md` updated as architecture changes.
