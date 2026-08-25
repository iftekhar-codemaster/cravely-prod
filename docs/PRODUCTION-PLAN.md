# Cravely — Production Readiness Plan

Decisions locked in:
- Canonical SEO domain: **app.cravely.space** (restaurant/dish pages get indexed there)
- **cravely.space** = marketing landing page; logged-in users redirect to the app
- Landing lives in **this same repo** (route-based, host split via middleware)
- Mock features: **hybrid** — build real reviews/offers/map; remove pre-order/notifications/help fakes

---

## 1. Domain split (same repo, two hosts)

How it works: one Vercel project, both domains attached. `middleware.ts` inspects
the request host:
- `cravely.space` / `www.cravely.space` → rewrite `/` to the landing page (`src/app/(marketing)/`)
- `app.cravely.space` → the app as-is (current `/` home)

### I (agent) handle — code side
- [ ] `middleware.ts` host-based rewrite (apex → landing, app subdomain → app)
- [ ] Landing page: `src/app/(marketing)/` — hero, value props, live top
      restaurants/dishes (SSR via `src/lib/data.ts`), CTA → `https://app.cravely.space`
- [ ] Privacy policy + terms pages (static, under `(marketing)`)
- [ ] `vercel.json`: 308 redirect `cravely-prod.vercel.app` → `app.cravely.space`
- [ ] `firebase.json`: add `cravely.space`, `www.cravely.space`, `app.cravely.space`
      to authorizedDomains (keep old domains during transition)
- [ ] `metadataBase: https://app.cravely.space` in root metadata
- [ ] Logged-in redirect: on apex, if authed session → redirect to `app.cravely.space`

### You handle — dashboard/DNS side (cannot be done from code)
- [ ] Vercel dashboard → Project → Settings → Domains → add `cravely.space`,
      `www.cravely.space`, `app.cravely.space`
- [ ] At the domain registrar (where cravely.space was bought):
      - `A` record `@` → `76.76.21.21`
      - `CNAME` record `www` → `cname.vercel-dns.com`
      - `CNAME` record `app` → `cname.vercel-dns.com`
      (Vercel shows exact values in the domains UI; SSL auto-provisions)
- [ ] Firebase Console → Authentication → Settings → Authorized domains → add
      `cravely.space`, `app.cravely.space` (CLI deploy of auth domains is unreliable;
      console is the source of truth)
- [ ] Google Search Console: verify both properties, submit sitemap for
      `app.cravely.space`

## 2. SEO foundation (GSC-ready)

- [ ] Root `layout.tsx`: `metadataBase`, `title: { default, template: "%s · Cravely" }`,
      `openGraph` + `twitter` defaults, canonical alternates
- [ ] Convert `/restaurants/[id]` + `/product/[id]` from `"use client"` to server
      components (data.ts already works SSR — see `/maps`, `/search`) +
      `generateMetadata` per entity
- [ ] JSON-LD: `Restaurant` (+ menu/MenuItem), `Product/MenuItem` with price offers,
      `BreadcrumbList`
- [ ] `src/app/sitemap.ts`: static public pages + all restaurants + all dishes
- [ ] `src/app/robots.ts`: disallow `/console`, `/api`, `/profile`, `/login`,
      `/verify-email`; link sitemap
- [ ] Per-route metadata: `/` (app home), `/search`, `/packages`, `/maps`, `/restaurants`
- [ ] SSR home sections + `RestaurantList` (currently client-fetched → crawlers see
      skeletons)
- [ ] OG images: static for landing, dynamic `ImageResponse` for restaurant/dish pages
- [ ] Remove/flag `data.ts` silent mock-data fallback in production
- [ ] Self-host Font Awesome (render-blocking CDN) or inline SVGs
- [ ] AppGate: drop the forced 800ms delay on client navigations (keep initial
      auth splash only)

## 3. Build real (hybrid scope)

- [ ] **Reviews**: `reviews` Firestore collection (subject id + author), write path
      for signed-in users on dish page, recompute `rating`/`reviews` aggregates on
      write, initials/uploaded avatars. Remove hardcoded `reviewPool`
      (`data.ts:155`, `mock-data.ts:416`)
- [ ] **Offers CRUD**: admin/restaurant console editor (R2 image upload, expiry date,
      promo code); home carousel reads live data, hides expired
- [ ] **Real map**: reuse `LocationMap`/Leaflet on `/maps` — all-restaurant markers +
      `navigator.geolocation`, haversine distances (replace static `distanceKm`)
- [ ] **Per-user state sync**: likes/views/geo-consent → Firestore user doc
      (localStorage stays as guest cache); fix `ForYou.tsx:36` marking opted-in on
      geolocation deny

## 4. Remove fakes

- [ ] Pre-order button (`BottomNav.tsx:92`) → remove or replace with call/WhatsApp CTA
- [ ] Notifications + Help rows (`profile/page.tsx:235-236`) → remove until real
- [ ] "Also ate together with" (`data.ts:150`) → use `pairsWith` when set, else
      category picks, labeled honestly
- [ ] "Popular right now" (`packages/page.tsx:329`) → rank by rating/views, not
      `slice(0,10)`
- [ ] Cuisine tiles (`HomeSections.tsx:79`) → curated images, not position-indexed
      loremflickr
- [ ] Social links (`page.tsx:43`) → real URLs or remove
- [ ] `Wizards.tsx:238` canned description + random-image fallback → require real
      content or neutral branded placeholder
- [ ] Restaurant approval (`applications/page.tsx:93`) → stop assigning random
      loremflickr hero/logo

## 5. Content + launch polish

- [ ] Replace all loremflickr seed imagery with real photos (or a clearly-labeled
      demo tenant)
- [ ] GSC: submit sitemap, request indexing on money pages
- [ ] Final: `npm run lint` + `npm run build`, Lighthouse/CWV on landing + dish page,
      PWA install flow check (Android/iOS)
- [ ] Update AGENTS.md with final domain setup

---

Sequencing: 1 → 2 are launch blockers, 3 lands incrementally, 4 before launch, 5 last.
Biggest chunks: server-component conversion + JSON-LD (2), reviews system (3).
