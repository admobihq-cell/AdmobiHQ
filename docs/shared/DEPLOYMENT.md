# Deployment guide

Production and staging deployment for **Admobi** (`apps/web`), **API** (`apps/api`), **Ops console** (`apps/ops`), **Customer app** (`apps/customer-web`), **Driver app** (`apps/driver-web`), and **Expo mobile apps** (`apps/ops-mobile`, `apps/customer-mobile`, `apps/driver-mobile`).

**Related:** [DEV-SETUP.md](./DEV-SETUP.md), [OPS-ADMIN.md](../ops/OPS-ADMIN.md), [API.md](../api/API.md), [APP.md](../customer/APP.md), [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

---

## Platform overview

Five **separate Vercel projects** from one GitHub repo. Each project has its own root directory, domains, env vars, and (if using Infisical) its **own Vercel sync** — syncing secrets to the web project does **not** populate api, ops, app, or driver.

| | **Web** | **API** | **Ops** | **App** | **Driver** |
|---|---------|---------|---------|---------|------------|
| **Repo path** | `apps/web` | `apps/api` | `apps/ops` | `apps/customer-web` | `apps/driver-web` |
| **Purpose** | Marketing site + Payload CMS | Business REST API (`/v1`) | Internal admin UI | Advertiser product | Driver product |
| **Production** | [admobihq.com](https://admobihq.com) | [api.admobihq.com](https://api.admobihq.com) | [ops.admobihq.com](https://ops.admobihq.com) | [app.admobihq.com](https://app.admobihq.com) | [driver.admobihq.com](https://driver.admobihq.com) |
| **Staging** (`staging` branch) | staging.admobihq.com | api.staging.admobihq.com | ops.staging.admobihq.com | app.staging.admobihq.com | driver.staging.admobihq.com |
| **Local port** | `:3000` | `:3003` | `:3001` | `:3002` | `:3004` |
| **Auth** | Payload at `/admin` | Ops JWT on `/v1/*`; customer/driver JWTs on `/v1/customer/*` and `/v1/driver/*`; public on `/v1/public/*` | Clerk (staff UI only, `@admobihq.com`-locked) | Clerk (own instance, flag-gated) | Clerk (own instance, flag-gated) |
| **Database** | Prisma + Payload (owner) | Prisma (shared) | Prisma read (server stats); CRUD via API | None (calls API) | None (calls API) |
| **Build** | `next build --webpack` | `next build --webpack` | `next build --webpack` | `next build --webpack` | `next build --webpack` |

**Branch → deploy:** push to `staging` → preview/staging domains on all five projects; merge to `master` → production domains.

**Deploy order after API URL changes:** deploy **API first**, then redeploy web, ops, app, and driver so build-time `NEXT_PUBLIC_API_URL` is inlined correctly.

---

## Fluid compute and caching

The five Next.js apps run on **Vercel Fluid** (Node.js serverless), not Edge — except marketing [`apps/web/middleware.ts`](../../apps/web/middleware.ts), which is Edge. Neon Postgres is a **separate** compute meter from Vercel CPU.

The Infisical/Vercel team is **Hobby**: **4 Active CPU hours/month shared across all five projects**. Frequent master deploys reset ISR; Satori `ImageResponse` icons/OG and Payload on every marketing request are what used to burn the quota. Current mitigations:

| Layer | What it does |
|-------|----------------|
| Static brand PNGs | `app/icon.png` + `app/apple-icon.png` in all five apps; marketing `app/opengraph-image.png`; `apps/web/public/logo.png` (rewrite `/logo` → `/logo.png`). Regenerate with `npm run brand:icons`. Do not add `icon.tsx` / `ImageResponse` routes back. |
| Probe middleware | Marketing Edge middleware 404s scanner paths (`lib/seo/bot-probes.ts`) without Node, Payload, or Neon. |
| Static 404 | [`apps/web/app/global-not-found.tsx`](../../apps/web/app/global-not-found.tsx) — no `cookies()`, no CMS. |
| Marketing ISR | `export const revalidate = 86400` on marketing page/layout files (Next.js requires a numeric literal). Query helpers use `MARKETING_REVALIDATE_SECONDS`. CMS hooks `revalidateTag(..., "max")` + `revalidatePath` on publish. Header/blog/help queries use `unstable_cache`. |
| Skip rebuilds | Each app `vercel.json` sets `ignoreCommand` to `node ../../scripts/vercel-ignore-build.mjs` — docs-only (and other-app) commits do not rebuild, so they do not wipe ISR. |
| Flags | `GET /v1/public/config` — 5 min in-memory cache, skip rate-limit on hit, `Cache-Control: s-maxage=300`. Customer/driver fetch `revalidate: 300`. Ops stats and driver profile caches are also 300s. |
| Images | `images.minimumCacheTTL` 31 days on marketing; long Cache-Control on static icons. |

Hobby still has one Vercel Cron per day (the API push-receipts job). That cron is not the CPU problem.

---

## Domain map

| App | Vercel root | Production | Staging (`staging` branch) | Local |
|-----|-------------|------------|----------------------------|-------|
| Marketing + CMS | `apps/web` | `admobihq.com` | `staging.admobihq.com` | `:3000` |
| Business API | `apps/api` | `api.admobihq.com` | `api.staging.admobihq.com` | `:3003` |
| Ops console | `apps/ops` | `ops.admobihq.com` | `ops.staging.admobihq.com` | `:3001` |
| Customer app | `apps/customer-web` | `app.admobihq.com` | `app.staging.admobihq.com` | `:3002` |
| Driver app | `apps/driver-web` | `driver.admobihq.com` | `driver.staging.admobihq.com` | `:3004` |

Payload CMS REST stays on the web app (`admobihq.com/api/*`). Business APIs live on `api.admobihq.com/v1/*` (admin) and `/v1/public/*` (marketing forms).

---

## Before first deploy

### 1. Database — ops schema (required)

Run the **additive** ops migration on prod and staging Neon. This does **not** touch Payload tables.

```bash
# With prod DATABASE_URL in env (Infisical prod → pull, or Neon SQL Editor)
npm run db:ops-schema -w web
```

Or paste [`apps/web/prisma/scripts/ops-schema-additive.sql`](../../apps/web/prisma/scripts/ops-schema-additive.sql) into the Neon SQL Editor.

**Do not run** `npm run db:push -w web` on the shared database — it would drop Payload CMS tables.

### 2. Infisical environments

Create **`staging`** in Infisical alongside `dev` and `prod`.

| Variable | dev | staging | prod |
|----------|-----|---------|------|
| `DATABASE_URL` | dev Neon | staging Neon | prod Neon |
| `PAYLOAD_SECRET` | dev | staging | prod |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` | `https://staging.admobihq.com` | `https://admobihq.com` |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3000` | `https://staging.admobihq.com` | `https://admobihq.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3003` | `https://api.staging.admobihq.com` | `https://api.admobihq.com` |
| `NEXT_PUBLIC_OPS_URL` | `http://localhost:3001` | `https://ops.staging.admobihq.com` | `https://ops.admobihq.com` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3002` | `https://app.staging.admobihq.com` | `https://app.admobihq.com` |
| `NEXT_PUBLIC_DRIVER_URL` | `http://localhost:3004` | `https://driver.staging.admobihq.com` | `https://driver.admobihq.com` |
| `NEXT_PUBLIC_ALLOW_INDEXING` | (omit / `true`) | `false` | (omit / `true`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | test | test | live (recommended) |
| `CLERK_SECRET_KEY` | full test key | full test key | full live key |
| `BLOB_READ_WRITE_TOKEN` | dev | staging or shared | prod |

Pull locally:

```bash
npm run env:pull              # dev → web + api + ops + app + driver .env.local
npm run env:pull:staging      # staging → web + api + ops + app + driver .env.local
```

### Which secrets go where

Infisical holds **all** keys below. Each Vercel project only needs **its row** — configure one Infisical → Vercel integration per project (or paste manually).

| Variable | Web Vercel | API Vercel | Ops Vercel | App Vercel | Driver Vercel | Notes |
|----------|:----------:|:----------:|:----------:|:----------:|:--------------:|-------|
| `DATABASE_URL` | ✓ | ✓ | ✓ | — | — | Shared Neon |
| `PAYLOAD_SECRET` | ✓ | — | — | — | — | Payload CMS only |
| `NEXT_PUBLIC_SERVER_URL` | ✓ | — | — | — | — | Legacy web canonical URL |
| `NEXT_PUBLIC_WEB_URL` | ✓ | — | ✓ | optional | optional | Marketing + CMS links |
| `NEXT_PUBLIC_API_URL` | ✓ | ✓ | ✓ | optional | ✓ | Business API origin; **redeploy after change** |
| `NEXT_PUBLIC_OPS_URL` | optional | — | ✓ | optional | optional | Ops console UI origin |
| `NEXT_PUBLIC_APP_URL` | — | — | — | ✓ | optional | Customer app origin |
| `NEXT_PUBLIC_DRIVER_URL` | — | — | — | — | ✓ | Driver app origin |
| `NEXT_PUBLIC_ALLOW_INDEXING` | ✓ (staging: `false`) | — | — | — | — | Staging web noindex |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | ✓ | ✓ | — | — | API + ops; **redeploy after change** |
| `CLERK_SECRET_KEY` | — | ✓ | ✓ | — | — | API + ops |
| `API_CORS_ORIGINS` | — | ✓ | — | — | — | Cross-origin callers (web, ops, app, driver, Expo) |
| `CUSTOMER_CLERK_SECRET_KEY` | — | ✓ | — | ✓ (when auth on) | — | Customer instance: API `/v1/customer/*` + customer-web middleware |
| `DRIVER_CLERK_SECRET_KEY` | — | ✓ | — | — | ✓ (when auth on) | Driver instance: API `/v1/driver/*` + driver-web middleware |
| `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY` | — | — | — | ✓ (when auth on) | — | Customer web Clerk |
| `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY` | — | — | — | — | ✓ (when auth on) | Driver web Clerk |
| `CLERK_ENCRYPTION_KEY` | — | — | — | ✓ (when auth on) | ✓ (when auth on) | Required for dynamic Clerk keys |
| `BLOB_READ_WRITE_TOKEN` | ✓ | — | — | — | — | Payload media uploads |
| `RESEND_*`, `REDIS_URL`, etc. | — | ✓ | — | — | — | Public form emails (see DEV-SETUP) |

**Important:** `NEXT_PUBLIC_*` vars are inlined at **build time**. After changing them in Vercel or Infisical, **redeploy** that project.

---

## Vercel — five projects

Use the **same GitHub repo** with **five** Vercel projects (create each in Vercel → Add New → Project → same repo, different root directory).

Each app ships a `vercel.json`. All five set `ignoreCommand` to `node ../../scripts/vercel-ignore-build.mjs` (skip rebuild when the commit does not touch that app). API also declares the daily cron.

Suggested project names (yours may differ): **Admobi Web**, **Admobi API**, **Admobi Ops**, **Admobi App**, **Admobi Driver**.

### Project 1: Web (`apps/web`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Node.js | 22.x |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | Default, or `cd ../.. && npm run build -w web` |

**Domains**

- Production: `admobihq.com`
- Staging: `staging.admobihq.com` → assign to **`staging` branch** (Settings → Domains)

**Environment variables** (Infisical → Vercel sync or manual)

| Vercel scope | Infisical env |
|--------------|---------------|
| Production | `prod` |
| Preview (staging branch) | `staging` |

Staging must include `NEXT_PUBLIC_ALLOW_INDEXING=false`.

Web needs `NEXT_PUBLIC_API_URL` so marketing forms call the API at build time.

After first prod deploy: run Payload migrate + seed once if CMS is empty ([BLOG-CMS.md](../web/BLOG-CMS.md)).

### Project 2: API (`apps/api`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/api` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | `cd ../.. && npm run build -w api` if default fails |

**Domains**

- Production: `api.admobihq.com`
- Staging: `api.staging.admobihq.com` → **`staging` branch**

**API env vars:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_ORG_ID`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `DRIVER_CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `API_CORS_ORIGINS`, `resend_api_key`, `SENDER_EMAIL`, `ADMIN_EMAIL`, `REDIS_URL`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

`CRON_SECRET` gates the Vercel Cron push-receipts sweep and system-triggered broadcasts (see [API.md](../api/API.md#service-to-service-auth)). `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` back rate limiting on public routes — the API **fails open** (no throttling, not a 500) if either is unset, so it's safe to deploy without them, just not safe to stay that way in production. See [API.md](../api/API.md#rate-limiting).

Smoke check: `GET /v1/health` → `{ "ok": true, "service": "admobi-api", "version": "v1" }`.

### Project 3: Ops (`apps/ops`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/ops` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | `cd ../.. && npm run build -w ops` if default fails |

**Domains**

- Production: `ops.admobihq.com`
- Staging: `ops.staging.admobihq.com` → **`staging` branch**

**Ops env vars:** `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_OPS_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_URL`.

Ops is UI-only; CRUD calls go to `NEXT_PUBLIC_API_URL/v1/*`.

### Project 4: App (`apps/customer-web`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/customer-web` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | `cd ../.. && npm run build -w customer-web` if default fails |

**Domains**

- Production: `app.admobihq.com`
- Staging: `app.staging.admobihq.com` → **`staging` branch**

**App env vars:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_OPS_URL`, `NEXT_PUBLIC_API_URL`. When auth is on: `NEXT_PUBLIC_AUTH_ENABLED=true`, `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY`. See [AUTH.md](./AUTH.md).

Smoke check after deploy: `GET /api/health` → `{ "ok": true, "service": "admobi-app" }`.

### Project 5: Driver (`apps/driver-web`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/driver-web` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | `cd ../.. && npm run build -w driver-web` if default fails |

**Domains**

- Production: `driver.admobihq.com`
- Staging: `driver.staging.admobihq.com` → **`staging` branch**

**Driver env vars:** `NEXT_PUBLIC_DRIVER_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`. When auth is on: `NEXT_PUBLIC_AUTH_ENABLED=true`, `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY`, `DRIVER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY`. See [AUTH.md](./AUTH.md).

Smoke check after deploy: `GET /api/health` → `{ "ok": true, "service": "admobi-driver" }`.

---

## DNS (typical Vercel records)

| Host | Type | Target |
|------|------|--------|
| `@` (apex) | A / ALIAS | Vercel apex |
| `staging` | CNAME | `cname.vercel-dns.com` |
| `ops` | CNAME | `cname.vercel-dns.com` |
| `api` | CNAME | `cname.vercel-dns.com` |
| `api.staging` | CNAME | `cname.vercel-dns.com` |
| `ops.staging` | CNAME | `cname.vercel-dns.com` |
| `app` | CNAME | `cname.vercel-dns.com` |
| `app.staging` | CNAME | `cname.vercel-dns.com` |
| `driver` | CNAME | `cname.vercel-dns.com` |
| `driver.staging` | CNAME | `cname.vercel-dns.com` |

Use the exact records shown in Vercel → Domains for your project.

---

## Clerk

Deploy-time config only (allowed origins, key types per environment). For sign-in flows, the `AUTH_ENABLED` feature flag, organizations, and roles/permissions, see [AUTH.md](./AUTH.md).

**Three independent Clerk applications** — no shared session, no satellite domains between them. This is a deliberate departure from the "two Clerk instances" plan in [ROADMAP.md](./ROADMAP.md) (customer + driver were originally meant to share one instance; splitting them removed a domain-primary/satellite conflict and all role-mismatch handling). Phone/SMS is also dropped — customer and driver both use email + optional Google.

### Ops (staff)

App: **`app_3GALZRS50nwbrWeiFLZXxsgDIid`**

**Allowed origins / redirect URLs**

- Ops UI: `https://ops.admobihq.com`, `https://ops.staging.admobihq.com`, `http://localhost:3001`
- API: `https://api.admobihq.com`, `https://api.staging.admobihq.com`, `http://localhost:3003`

Cross-origin Bearer JWT from ops and `ops-mobile` validates against the API subdomain.

**Restrictions:** `@admobihq.com` email domain only.

**Keys:** test (`pk_test_` / `sk_test_`) for dev/staging; live keys for production ops. Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (also mapped to `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for `ops-mobile`).

### Customer (advertisers)

Separate Clerk application, used by both `apps/customer-web` and `apps/customer-mobile`. Email + Google, no domain restriction. Entry point: `app.admobihq.com/auth/login` and `/auth/signup` (also link out to the driver app's own login for anyone who picks "I'm a driver").

Env vars: `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY` / `CUSTOMER_CLERK_SECRET_KEY` (web), mapped to `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for `customer-mobile` via its `pull-env.mjs`.

### Driver

Separate Clerk application, used by both `apps/driver-web` and `apps/driver-mobile`. Email + Google (no SMS OTP — dropped, see above). Entry point: `driver.admobihq.com/auth/login` and `/auth/signup`.

Env vars: `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY` / `DRIVER_CLERK_SECRET_KEY` (web), mapped to `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for `driver-mobile` via its `pull-env.mjs`.

### Shared Infisical pool — name collisions matter

All three apps' secrets live in the **same flat Infisical project/environment** (one root `.infisical.json`, no per-app path scoping) — there is no folder isolation between apps. The customer/driver key names above are deliberately prefixed to avoid colliding with ops's plain `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`. **Never reuse the unprefixed names for a non-ops Clerk app** — doing so overwrites ops's working keys for every project pulling `dev`/`staging`/`prod` afterward.

**Feature flag:** `NEXT_PUBLIC_AUTH_ENABLED` (web) / `EXPO_PUBLIC_AUTH_ENABLED` (mobile) gates whether each app mounts its `ClerkProvider` at all — defaults to `false`/unset, kept local-only (not in Infisical), so a missing key never crashes the app.

Ensure `CLERK_SECRET_KEY` (and the customer/driver equivalents) are the **full** key (truncated keys cause `secret-key-invalid`).

---

## GitHub Actions secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | CI CMS bootstrap |
| `PAYLOAD_SECRET` | CI CMS bootstrap |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Ops build in CI |
| `CLERK_SECRET_KEY` | Ops build in CI |
| `NEXT_PUBLIC_API_URL` | API + client build metadata |
| `EXPO_PUBLIC_API_URL` | Mobile bundle (mapped from `NEXT_PUBLIC_API_URL` on env pull) |
| `NEXT_PUBLIC_OPS_URL` | Ops build metadata |
| `NEXT_PUBLIC_APP_URL` | App build metadata |
| `NEXT_PUBLIC_DRIVER_URL` | Driver build metadata |
| `NEXT_PUBLIC_WEB_URL` | Ops CMS link metadata |

Existing web secrets (`BLOB_READ_WRITE_TOKEN`, etc.) remain as documented in [DEV-SETUP.md](./DEV-SETUP.md).

---

## Deploy workflow

1. Push to **`staging`** → Vercel deploys preview domains with Infisical `staging` env.
2. Smoke test staging (see below).
3. Merge to **`master`** → production deploy on `admobihq.com`, `api.admobihq.com`, `ops.admobihq.com`, `app.admobihq.com`, and `driver.admobihq.com`.

Mobile apps (Android APK) are **not** deployed on Vercel — they use **EAS Build** on [expo.dev](https://expo.dev). See [Mobile distribution](#mobile-distribution-eas) below.

---

## Mobile distribution (EAS)

Android APKs for the three Expo apps (ops, customer, driver) are built and distributed via **Expo Application Services (EAS)**, not Vercel.

| App | Folder | EAS slug | Android package |
|-----|--------|----------|-----------------|
| Admobi Ops | `apps/ops-mobile` | `admobihq-ops` | `com.admobihq.ops` |
| Admobi (customer) | `apps/customer-mobile` | `admobihq-app` | `com.admobihq.app` |

**Full guide:** [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

### Build preview APK (team install)

Run from each app directory:

```powershell
cd apps\ops-mobile
npx eas-cli build -p android --profile preview

cd apps\customer-mobile
npx eas-cli build -p android --profile preview
```

Share the **APK download URL** from the EAS dashboard. Preview builds bundle JS — recipients do **not** need a dev machine running Metro.

### OTA updates (no reinstall)

After the first EAS build, configure updates once per app:

```powershell
npx eas-cli update:configure
```

Push JS-only changes to installed preview apps:

```powershell
npx eas-cli update --channel preview --message "Describe change"
```

Native changes (new Expo plugins, permissions, `runtimeVersion` bump) require a new `eas build`.

### Mobile env vars (Infisical → EAS)

| Variable | Ops | Customer | Notes |
|----------|-----|----------|-------|
| `EXPO_PUBLIC_API_URL` | ✓ | ✓ | Inlined at EAS build; set in EAS project env or build from pulled `.env.local` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✓ | — | Ops staff auth |
| `EXPO_PUBLIC_OPS_URL` | Optional | Optional | Cross-links |

For EAS Build, configure **preview** (and **production**) environment variables in the [Expo dashboard](https://expo.dev) per project, or ensure secrets are present in the uploaded archive via Infisical pull before building.

### Signing

First Android build generates a **keystore stored on Expo** (remote credentials). Keep the Expo org/account access — it controls signing for all future APK updates.

---

## Smoke tests

### Web production

- [ ] `/`, `/blog`, `/help` load
- [ ] `/admin` login works
- [ ] Form POST to `api.admobihq.com/v1/public/leads` persists data

### API production

- [ ] `GET /v1/health` returns `{ ok: true }`
- [ ] Public form POST to `/v1/public/waitlist` works with CORS from web origin
- [ ] Authenticated `GET /v1/leads` returns 401 without token

### Ops production

- [ ] Sign in with `@admobihq.com` at `ops.admobihq.com`
- [ ] Overview KPIs and charts load
- [ ] CRUD on one entity (e.g. leads)
- [ ] CMS link opens `{NEXT_PUBLIC_WEB_URL}/admin`

### App production

- [ ] Sidebar shell loads at `app.admobihq.com`
- [ ] Overview, Campaigns, Map, Settings load; `/reports` is still Coming soon
- [ ] `/deliveries` redirects to `/` while the `deliveries` platform flag is off
- [ ] `GET /api/health` returns `{ ok: true }`

### Driver production

- [ ] Sidebar shell loads at `driver.admobihq.com`
- [ ] Routes `/`, `/routes`, `/payouts`, `/settings` render (Earnings, Routes, Payouts, Settings)
- [ ] `/deliveries` redirects to `/` while the `deliveries` platform flag is off
- [ ] Toggling the `deliveries` flag in ops (`/settings`) surfaces the Deliveries tab within ~5 minutes, no redeploy
- [ ] `GET /api/health` returns `{ ok: true, service: "admobi-driver" }`

### Mobile (preview APK)

After a new EAS preview build or OTA update:

- [ ] Ops APK installs and Clerk sign-in works against production/staging API
- [ ] Customer APK installs and opens without Metro
- [ ] Driver APK installs and opens without Metro
- [ ] Admobi splash and launcher icon show correctly (not Expo Go defaults)
- [ ] OTA: push `eas update --channel preview`, reopen app, change is visible

See [MOBILE-BUILDS.md](./MOBILE-BUILDS.md).

### Staging

Repeat on `staging.admobihq.com`, `api.staging.admobihq.com`, `ops.staging.admobihq.com`, `app.staging.admobihq.com`, and `driver.staging.admobihq.com` against the staging database.

Verify staging returns `X-Robots-Tag: noindex` and does not generate a public sitemap.

---

## Manual checklist (your action)

Use this when going live:

- [ ] **Vercel:** Five projects configured (`apps/web`, `apps/api`, `apps/ops`, `apps/customer-web`, `apps/driver-web`) with domains above
- [ ] **Infisical:** `staging` + `prod` envs synced to all five Vercel projects
- [ ] **Clerk:** Ops + API URLs in allowed origins; live keys in prod
- [ ] **Neon:** all additive SQL scripts applied on **every** environment's database (**not** `db:push` — see the warning above; nothing propagates automatically between environments), in order:
  - `npm run db:ops-schema -w web`
  - `npm run db:support-schema -w web`
  - `npm run db:announcements-soft-delete -w web`
  - `npm run db:announcements-image -w web`
  - `npm run db:audit-fixes -w web`
  - `npm run db:platform-flags -w web`
  - `npm run db:driver-push-and-targeting -w web`
- [ ] **GitHub:** Clerk + URL secrets added for CI
- [ ] **Expo / EAS:** Logged in; all three mobile projects linked (`admobihq-ops`, `admobihq-app`, `admobihq-driver`); preview APKs built for team testing

---

## Troubleshooting

### `500: MIDDLEWARE_INVOCATION_FAILED` on `ops.admobihq.com`

This almost always means **Clerk env vars are missing or wrong on the ops Vercel project** (not the web project).

1. **Vercel → ops project → Settings → Environment Variables**
   - `CLERK_SECRET_KEY` — full key (`sk_test_...` or `sk_live_...`), **not truncated**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — matching pair (`pk_test_...` or `pk_live_...`)
   - Enable for **Production** (and Preview if using staging)

2. **Redeploy** after saving env vars (Deployments → … → Redeploy).

3. **Clerk Dashboard** → your app → **Domains** — add `https://ops.admobihq.com`.

4. Confirm **Root Directory** is `apps/ops`, not `apps/web` (web on this domain would show marketing, not this error).

5. Local check:
   ```bash
   npm run env:check -w ops
   ```

If keys are correct locally but prod fails, re-copy from [Clerk API keys](https://dashboard.clerk.com/last-active?path=api-keys) into Infisical prod → Vercel sync.

### `ERR_REQUIRE_ESM` / 500 on `/`, `/sign-in`, favicon

Vercel’s Node launcher uses `require()` on `.next/server/**/*.js`. If `apps/ops/package.json` has `"type": "module"`, those files are treated as ESM and every page 500s after Clerk auth works.

**Fix (in repo):** ops must **not** use `"type": "module"` and should build with `next build --webpack` (same as web). Redeploy the ops Vercel project after merging.

Symptoms: signup works in Clerk UI, then “This page couldn’t load” / server error on redirect to `/` or `/sign-in`.

---

## Out of scope (future)

- `cms.admobihq.com` — add as alternate domain on the web Vercel project
- GitHub Actions → Vercel deploy job (Vercel Git integration is sufficient)
- Separate Clerk production application for **ops vs customer app** (optional hardening)
