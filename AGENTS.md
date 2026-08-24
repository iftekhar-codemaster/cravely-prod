# AGENTS.md

## Stack

- Next.js 16 App Router + React 19, Tailwind v4 (via `@tailwindcss/postcss`), TypeScript strict. Path alias `@/*` → `src/*`.
- Firebase client SDK for Auth + Firestore. No server-side Firebase Admin — everything runs as the signed-in user.
- Image uploads go to Cloudflare R2 via `POST /api/upload` (`src/app/api/upload/route.ts`); requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`. Uploads are authenticated with the user's Firebase ID token.

## Commands

- npm only (package-lock.json is committed; no lockfile for other package managers).
- Dev: `npm run dev`. Verify changes with `npm run lint` and `npm run build` (there is no test suite).
- Seed Firestore from `src/lib/mock-data.ts`: `npm run seed`. Idempotent — overwrites by fixed doc ids.
- Create super-admin account: `npm run bootstrap:admin`.

Both scripts run plain Node directly on `.ts` files (`node --env-file-if-exists=.env.local scripts/*.ts`) — requires a Node version with native TS type-stripping support. They read `.env.local`, not `.env`. `tsconfig.json` excludes `scripts/`, so typecheck/lint don't cover them.

## Architecture

- `src/lib/data.ts` reads live Firestore collections seeded by `npm run seed`; `src/lib/mock-data.ts` is the source dataset.
- Access control lives in `firestore.rules`: roles on each user doc are `super_admin`, `admin` (platform staff), `restaurant` (scoped to own `restaurantId`). Client mirrors this in `src/lib/user.ts` / `src/lib/adminSecurity.ts` (admin passkeys, IP allowlist enforcement toggle).
- Routes: consumer app at `/` (restaurants, search, product, liked, maps), admin panel under `/console/admin`, restaurant owner console at `/console/restaurant`. Only two API routes exist: `/api/my-ip`, `/api/upload`.
- Deployed on Vercel; canonical domain is `cravely.zone.id` — `vercel.json` redirects `cravely-prod.vercel.app` to it. If adding auth domains or new hosting domains, update `firebase.json` authorizedDomains and deploy rules/indexes via Firebase CLI.

## Conventions

- `.agents/` contains vendored agent skills — eslint ignores it entirely; do not treat it as app code.
- Env files are gitignored (`.env*`); `.env.example` documents only the Firebase vars, R2 vars are not listed there yet.
