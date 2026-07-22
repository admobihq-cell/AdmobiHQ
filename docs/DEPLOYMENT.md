# Deployment guide

Production and staging deployment for **Admobi** (`apps/web`), **API** (`apps/api`), **Ops console** (`apps/ops`), **Customer app** (`apps/customer-web`), and **Expo mobile apps** (`apps/ops-mobile`, `apps/customer-mobile`).

**Related:** [DEV-SETUP.md](./DEV-SETUP.md), [OPS-ADMIN.md](./OPS-ADMIN.md), [API.md](./API.md), [APP.md](./APP.md), [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

---

## Platform overview

Four **separate Vercel projects** from one GitHub repo. Each project has its own root directory, domains, env vars, and (if using Infisical) its **own Vercel sync** — syncing secrets to the web project does **not** populate api, ops, or app.

| | **Web** | **API** | **Ops** | **App** |
|---|---------|---------|---------|---------|
| **Repo path** | `apps/web` | `apps/api` | `apps/ops` | `apps/customer-web` |
| **Purpose** | Marketing site + Payload CMS | Business REST API (`/v1`) | Internal admin UI | Customer product (scaffold) |
| **Production** | [admobihq.com](https://admobihq.com) | [api.admobihq.com](https://api.admobihq.com) | [ops.admobihq.com](https://ops.admobihq.com) | [app.admobihq.com](https://app.admobihq.com) |
| **Staging** (`staging` branch) | staging.admobihq.com | api.staging.admobihq.com | ops.staging.admobihq.com | app.staging.admobihq.com |
| **Local port** | `:3000` | `:3003` | `:3001` | `:3002` |
| **Auth** | Payload at `/admin` | Clerk on `/v1/*` (admin); public on `/v1/public/*` | Clerk (staff UI only) | None yet |
| **Database** | Prisma + Payload (owner) | Prisma (shared) | — (UI calls API) | None yet |
| **Build** | `next build --webpack` | `next build --webpack` | `next build --webpack` | `next build --webpack` |

**Branch → deploy:** push to `staging` → preview/staging domains on all four projects; merge to `master` → production domains.

**Deploy order after API URL changes:** deploy **API first**, then redeploy web, ops, and app so build-time `NEXT_PUBLIC_API_URL` is inlined correctly.

---

## Domain map

| App | Vercel root | Production | Staging (`staging` branch) | Local |
|-----|-------------|------------|----------------------------|-------|
| Marketing + CMS | `apps/web` | `admobihq.com` | `staging.admobihq.com` | `:3000` |
| Business API | `apps/api` | `api.admobihq.com` | `api.staging.admobihq.com` | `:3003` |
| Ops console | `apps/ops` | `ops.admobihq.com` | `ops.staging.admobihq.com` | `:3001` |
| Customer app | `apps/customer-web` | `app.admobihq.com` | `app.staging.admobihq.com` | `:3002` |

Payload CMS REST stays on the web app (`admobihq.com/api/*`). Business APIs live on `api.admobihq.com/v1/*` (admin) and `/v1/public/*` (marketing forms).

---

## Before first deploy

### 1. Database — ops schema (required)

Run the **additive** ops migration on prod and staging Neon. This does **not** touch Payload tables.

```bash
# With prod DATABASE_URL in env (Infisical prod → pull, or Neon SQL Editor)
npm run db:ops-schema -w web
```

Or paste [`apps/web/prisma/scripts/ops-schema-additive.sql`](../apps/web/prisma/scripts/ops-schema-additive.sql) into the Neon SQL Editor.

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
| `NEXT_PUBLIC_ALLOW_INDEXING` | (omit / `true`) | `false` | (omit / `true`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | test | test | live (recommended) |
| `CLERK_SECRET_KEY` | full test key | full test key | full live key |
| `BLOB_READ_WRITE_TOKEN` | dev | staging or shared | prod |

Pull locally:

```bash
npm run env:pull              # dev → web + api + ops + app .env.local
npm run env:pull:staging      # staging → web + api + ops + app .env.local
```

### Which secrets go where

Infisical holds **all** keys below. Each Vercel project only needs **its row** — configure one Infisical → Vercel integration per project (or paste manually).

| Variable | Web Vercel | API Vercel | Ops Vercel | App Vercel | Notes |
|----------|:----------:|:----------:|:----------:|:----------:|-------|
| `DATABASE_URL` | ✓ | ✓ | ✓ | — | Shared Neon |
| `PAYLOAD_SECRET` | ✓ | — | — | — | Payload CMS only |
| `NEXT_PUBLIC_SERVER_URL` | ✓ | — | — | — | Legacy web canonical URL |
| `NEXT_PUBLIC_WEB_URL` | ✓ | — | ✓ | optional | Marketing + CMS links |
| `NEXT_PUBLIC_API_URL` | ✓ | ✓ | ✓ | optional | Business API origin; **redeploy after change** |
| `NEXT_PUBLIC_OPS_URL` | optional | — | ✓ | optional | Ops console UI origin |
| `NEXT_PUBLIC_APP_URL` | — | — | — | ✓ | Customer app origin |
| `NEXT_PUBLIC_ALLOW_INDEXING` | ✓ (staging: `false`) | — | — | — | Staging web noindex |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | ✓ | ✓ | — | API + ops; **redeploy after change** |
| `CLERK_SECRET_KEY` | — | ✓ | ✓ | — | API + ops |
| `API_CORS_ORIGINS` | — | ✓ | — | — | Cross-origin callers (web, ops, app, Expo) |
| `BLOB_READ_WRITE_TOKEN` | ✓ | — | — | — | Payload media uploads |
| `RESEND_*`, `REDIS_URL`, etc. | — | ✓ | — | — | Public form emails (see DEV-SETUP) |

**Important:** `NEXT_PUBLIC_*` vars are inlined at **build time**. After changing them in Vercel or Infisical, **redeploy** that project.

---

## Vercel — four projects

Use the **same GitHub repo** with **four** Vercel projects (create each in Vercel → Add New → Project → same repo, different root directory).

Suggested project names (yours may differ): **Admobi Web**, **Admobi API**, **Admobi Ops**, **Admobi App**.

### Project 1: Web (`apps/web`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Node.js | 20.x |
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

After first prod deploy: run Payload migrate + seed once if CMS is empty ([BLOG-CMS.md](./BLOG-CMS.md)).

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

**API env vars:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `API_CORS_ORIGINS`, `RESEND_API_KEY`, `SENDER_EMAIL`, `ADMIN_EMAIL`, `REDIS_URL`.

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

**App env vars:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_OPS_URL`, `NEXT_PUBLIC_API_URL` (optional cross-links). No auth secrets required until the product login phase.

Smoke check after deploy: `GET /api/health` → `{ "ok": true, "service": "admobi-app" }`.

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

Use the exact records shown in Vercel → Domains for your project.

---

## Clerk

App: **`app_3GALZRS50nwbrWeiFLZXxsgDIid`**

**Allowed origins / redirect URLs**

- Ops UI: `https://ops.admobihq.com`, `https://ops.staging.admobihq.com`, `http://localhost:3001`
- API: `https://api.admobihq.com`, `https://api.staging.admobihq.com`, `http://localhost:3003`

Cross-origin Bearer JWT from ops and mobile validates against the API subdomain.

The customer app (`apps/customer-web`) has **no auth yet** — add app URLs here when login ships.

**Restrictions:** `@admobihq.com` email domain only (ops).

**Keys:** test (`pk_test_` / `sk_test_`) for dev/staging; live keys for production ops.

Ensure `CLERK_SECRET_KEY` is the **full** key (truncated keys cause `secret-key-invalid`).

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
| `NEXT_PUBLIC_WEB_URL` | Ops CMS link metadata |

Existing web secrets (`BLOB_READ_WRITE_TOKEN`, etc.) remain as documented in [DEV-SETUP.md](./DEV-SETUP.md).

---

## Deploy workflow

1. Push to **`staging`** → Vercel deploys preview domains with Infisical `staging` env.
2. Smoke test staging (see below).
3. Merge to **`master`** → production deploy on `admobihq.com`, `api.admobihq.com`, `ops.admobihq.com`, and `app.admobihq.com`.

Mobile apps (Android APK) are **not** deployed on Vercel — they use **EAS Build** on [expo.dev](https://expo.dev). See [Mobile distribution](#mobile-distribution-eas) below.

---

## Mobile distribution (EAS)

Android APKs for ops and customer Expo apps are built and distributed via **Expo Application Services (EAS)**, not Vercel.

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
- [ ] Routes `/`, `/campaigns`, `/reports`, `/settings` show coming-soon states
- [ ] `GET /api/health` returns `{ ok: true }`

### Mobile (preview APK)

After a new EAS preview build or OTA update:

- [ ] Ops APK installs and Clerk sign-in works against production/staging API
- [ ] Customer APK installs and opens without Metro
- [ ] Admobi splash and launcher icon show correctly (not Expo Go defaults)
- [ ] OTA: push `eas update --channel preview`, reopen app, change is visible

See [MOBILE-BUILDS.md](./MOBILE-BUILDS.md).

### Staging

Repeat on `staging.admobihq.com`, `api.staging.admobihq.com`, `ops.staging.admobihq.com`, and `app.staging.admobihq.com` against the staging database.

Verify staging returns `X-Robots-Tag: noindex` and does not generate a public sitemap.

---

## Manual checklist (your action)

Use this when going live:

- [ ] **Vercel:** Four projects configured (`apps/web`, `apps/api`, `apps/ops`, `apps/customer-web`) with domains above
- [ ] **Infisical:** `staging` + `prod` envs synced to all four Vercel projects
- [ ] **Clerk:** Ops + API URLs in allowed origins; live keys in prod
- [ ] **Neon:** `ops-schema-additive.sql` applied on prod (and staging)
- [ ] **GitHub:** Clerk + URL secrets added for CI
- [ ] **Expo / EAS:** Logged in; both mobile projects linked (`admobihq-ops`, `admobihq-app`); preview APKs built for team testing

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
