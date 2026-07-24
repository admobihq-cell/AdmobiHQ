# Local development setup

Command reference for running **Admobi** locally: marketing site (`apps/web`), business API (`apps/api`), ops console (`apps/ops`), customer app (`apps/customer-web`), and **Payload** CMS. Run commands from the **repository root** unless noted.

**Related:** [API.md](./API.md), [DATA-LAYER.md](./DATA-LAYER.md), [HELP-CMS.md](./HELP-CMS.md), [BLOG-CMS.md](./BLOG-CMS.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js ≥ 20** | `node -v` |
| **npm 11** | Repo pins `npm@11.12.1` via `packageManager` |
| **Postgres** | Hosted URL (e.g. Neon) in `DATABASE_URL` — not required to run Postgres on localhost |
| **Infisical CLI** (optional) | For `env:pull` / team secrets — [infisical.com/docs](https://infisical.com/docs) |

One-time Infisical (if your team uses it):

```bash
infisical login
cd apps/web
infisical init   # links to workspace in .infisical.json at repo root
```

---

## Quick start (daily)

```bash
npm install
npm run dev                      # pulls Infisical dev secrets, then starts web + api + ops + app
```

`npm run dev` **automatically runs `env:pull`** before starting servers. Secrets land in each app's `.env.local`; Next.js loads them via `dotenv` in each workspace's `dev` script.

Skip the pull if you already have fresh `.env.local` files:

```bash
npm run dev:skip-pull
```

Include Expo apps (ops mobile + customer mobile):

```bash
npm run dev:all
```

**Mobile + API only** (no web, ops, or customer web — pulls secrets for `api`, `ops-mobile`, `customer-mobile` only):

```bash
npm run dev:stack:mobile              # api + both Expo apps
npm run dev:stack:mobile:ops          # api + ops Expo (:8081)
npm run dev:stack:mobile:customer     # api + customer Expo (:8082)
npm run dev:stack:mobile:skip-pull    # same stack, skip Infisical pull
```

Customer Expo only (Metro already running elsewhere, or API not needed):

```bash
npm run dev -w customer-mobile
```

**Installable APKs and OTA** (team phones, no Metro): see [MOBILE-BUILDS.md](./MOBILE-BUILDS.md).

Pull staging secrets locally:

```bash
npm run dev:staging
```

Optional checks after first setup:

```bash
npm run env:check -w web
npm run env:check -w api
npm run env:check -w ops
```

Open:

| URL | What |
|-----|------|
| http://localhost:3000 | Marketing site |
| http://localhost:3000/admin | Payload CMS |
| http://localhost:3003 | **Business API** (`/v1`, `/v1/public`) |
| http://localhost:3003 | **Business API** (`/v1`, `/v1/public`, `/v1/health`) |
| http://localhost:3001 | **Ops console** (Clerk auth, @admobihq.com) |
| http://localhost:3002 | **Customer app** (sidebar shell, no auth yet) |

**Prefer `npm run dev`** (webpack). Use `npm run dev:turbo -w web` only if you accept less-tested Payload + Turbopack behaviour.

Run a single app: `npm run dev -w api`, `npm run dev -w ops`, etc. See [OPS-ADMIN.md](./OPS-ADMIN.md).

---

## Environment variables

Secrets live in **Infisical**; locally they are exported to **`apps/web/.env.local`**, **`apps/api/.env.local`**, **`apps/ops/.env.local`**, **`apps/customer-web/.env.local`**, **`apps/ops-mobile/.env.local`**, and **`apps/customer-mobile/.env.local`** (never commit). Template: [`.env.example`](../.env.example), [`apps/api/.env.example`](../apps/api/.env.example), [`apps/ops/.env.example`](../apps/ops/.env.example), [`apps/customer-web/.env.example`](../apps/customer-web/.env.example), [`apps/customer-mobile/.env.example`](../apps/customer-mobile/.env.example).

### Pull from Infisical (recommended on Windows)

```bash
npm run env:pull -w web          # apps/web/.env.local
npm run env:pull -w api          # apps/api/.env.local
npm run env:pull -w ops          # apps/ops/.env.local
npm run env:pull -w customer-web          # apps/customer-web/.env.local
npm run env:pull -w ops-mobile       # apps/ops-mobile/.env.local (maps EXPO_PUBLIC_*)
npm run env:pull -w customer-mobile   # apps/customer-mobile/.env.local (no Clerk)
npm run env:pull:staging -w api  # staging env
# or all workspaces:
npm run env:pull
```

`npm run dev` runs **`env:pull` automatically** before starting servers (see [Quick start](#quick-start-daily)).

### Infisical one-off commands (PowerShell)

Use `--command` — do not use `infisical run -- npm ...` on PowerShell.

```powershell
infisical secrets --env=dev
infisical run --env=dev --command "npm run payload:migrate -w web"
```

If `infisical run` exits instantly with no output, use **`env:pull`** and normal `npm` instead.

### Manual `.env.local`

Copy `.env.example` → `apps/web/.env.local` and fill from Infisical dashboard.

| Variable | Required for | When |
|----------|----------------|------|
| `DATABASE_URL` | Prisma forms, Payload (default) | Always locally |
| `PAYLOAD_SECRET` | Payload admin + CMS pages | Always (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SERVER_URL` | Admin links, metadata | `http://localhost:3000` locally |
| `NEXT_PUBLIC_API_URL` | Marketing forms → API | `http://localhost:3003` locally |
| `BLOB_READ_WRITE_TOKEN` | Media uploads in `/admin` | Optional locally; needed for real uploads |
| `resend_api_key`, `SENDER_EMAIL`, `ADMIN_EMAIL` | Form confirmation emails | Set on **api** app (not web) |
| `API_CORS_ORIGINS` | Cross-origin API access | Set on **api** app |
| `TEST_RECIPIENT_EMAIL` | Dev email redirect | Optional |
| `API_KEY_PEXELS` | Stock image search in admin | Optional |
| `PAYLOAD_DATABASE_URL` | Payload-only DB | Production split DB only |

Verify keys are loaded:

```bash
npm run env:check -w web
```

### GitHub Actions secrets

CI workflows ([`.github/workflows/pr.yml`](../.github/workflows/pr.yml), [`master.yml`](../.github/workflows/master.yml)) inject **repository secrets** into the job environment so `prisma generate`, typecheck, lint, and `npm run build` match local/Infisical config.

**Where to add them:** GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Use the **same names** as `.env.example` (values can come from Infisical dev or a dedicated CI/staging Neon database).

| Secret | Required in CI | Notes |
|--------|----------------|--------|
| `DATABASE_URL` | For CMS bootstrap | Neon pooled URL; optional for lint/typecheck/build |
| `PAYLOAD_SECRET` | For CMS bootstrap | Same as local (`openssl rand -hex 32`); optional for lint/typecheck/build |
| `NEXT_PUBLIC_SERVER_URL` | No | Defaults to `https://admobihq.com` if unset |
| `PAYLOAD_DATABASE_URL` | No | Only if you split CMS DB in staging |
| `BLOB_READ_WRITE_TOKEN` | No | Omit if you do not need Blob plugin paths in CI build |
| `API_KEY_PEXELS` | No | Admin image search only |
| `resend_api_key`, `SENDER_EMAIL`, `ADMIN_EMAIL`, `TEST_RECIPIENT_EMAIL` | api | Form emails; not required for build |
| `REDIS_URL` | api | Email queue; not required for build |
| `API_CORS_ORIGINS` | api | CORS allowlist |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | api + ops + mobile | Clerk |
| `CLERK_SECRET_KEY` | api + ops | Clerk server |
| `NEXT_PUBLIC_API_URL` | web, api, ops, customer-web, ops-mobile | Business API origin |
| `NEXT_PUBLIC_OPS_URL` | ops, app | Ops UI links |
| `NEXT_PUBLIC_APP_URL` | app | Customer app origin |
| `NEXT_PUBLIC_WEB_URL` | ops, app | Marketing links |

If `DATABASE_URL` or `PAYLOAD_SECRET` is missing, CI logs a **warning** and skips CMS bootstrap; lint, typecheck, and build still run (Dependabot PRs do not need a database).

When both secrets are present, after `prisma generate` CI runs **`npm run cms:bootstrap:ci -w web`**, which:

1. Applies Payload migrations (`payload:migrate:ci`)
2. Upserts help categories/articles (`seed:help:ci`)
3. Upserts blog posts and cover images (`seed:blog:ci`)

Seeds are **idempotent** (safe to re-run). This runs **before** `npm run build` so `/blog` and `/help` are not empty at static generation time. The database updated is whatever `DATABASE_URL` (and optional `PAYLOAD_DATABASE_URL`) your Infisical → GitHub sync points at — usually **dev/staging**, not production unless you configured that on purpose.

To skip bootstrap in a one-off workflow run, set repository variable `SKIP_CMS_BOOTSTRAP=true` (optional; not enabled by default).

**Fork PRs:** GitHub does not expose repository secrets to workflows from forked PRs. Use branches on the main repo or a `pull_request_target` policy only if you understand the security tradeoffs.

**Tip:** With Infisical → GitHub autosync, ensure `DATABASE_URL` and `PAYLOAD_SECRET` match the Neon DB you want CI to populate. Production deploys on Vercel still need the same migrate/seed against prod once (or content created in `/admin`).

---

## First-time database setup

**One Postgres database, two ORMs.** Prisma owns `leads`, `drivers`, `fleet_partners`. Payload owns `help_*`, `blog_*`, `media`, `users`, `payload_*`. See [DATA-LAYER.md](./DATA-LAYER.md).

### Scenario A — Brand-new database (no Payload tables yet)

```bash
npm install
npm run env:pull -w web
npm run env:check -w web

# 1) Prisma tables FIRST
npm run db:push -w web

# 2) Payload SQL migrations
npm run payload:migrate -w web
# First time only, if no migrations exist yet:
# npm run payload:migrate:create -w web -- --name initial_cms
# npm run payload:migrate -w web

# 3) Sample content (idempotent)
npm run seed:help -w web
npm run seed:blog -w web

# 4) Dev server — create first admin user in browser at /admin
npm run dev
```

### Scenario B — Payload already migrated (typical on this repo)

**Do not run `db:push`** — it can try to drop CMS tables.

```bash
npm run env:pull -w web
npm run seed:help -w web    # safe to re-run
npm run seed:blog -w web    # safe to re-run
npm run dev
```

### Scenario C — Prisma tables missing only

If CMS exists but `leads` / `drivers` / `fleet_partners` are missing, coordinate with the team before `db:push`. Prefer Prisma `migrate dev` once migration files exist, or a targeted SQL fix — avoid blind `db:push` on a shared DB.

---

## Command reference

All `npm run … -w web` commands execute in `apps/web` and load `.env.local` where noted.

### Install & run

| Command | When to run |
|---------|-------------|
| `npm install` | Clone, after pulling `package.json` dependency changes |
| `npm run dev` | **Every day** — pull Infisical dev secrets + start web, api, ops, app |
| `npm run dev:skip-pull` | Start apps without re-pulling secrets |
| `npm run dev:all` | Pull secrets + start web, api, ops, customer-web, ops-mobile, and customer-mobile (Expo) |
| `npm run dev:stack:mobile` | Pull **api + mobile secrets only**; start api + both Expo apps |
| `npm run dev:stack:mobile:ops` | Pull api + ops-mobile secrets; start api + ops Expo (:8081) |
| `npm run dev:stack:mobile:customer` | Pull api + customer-mobile secrets; start api + customer Expo (:8082) |
| `npm run env:pull:mobile-stack` | Pull secrets for api, ops-mobile, customer-mobile only (no web/ops/customer-web) |
| `npm run dev:staging` | Pull staging secrets + start apps |
| `npm run dev:turbo` | Start apps without pull (turbo only) |
| `npm run dev -w web` | Same, explicit workspace |
| `npm run dev:turbo -w web` | Faster HMR experiments; not the default for Payload |
| `npm run build` | Before release, CI parity, production check |
| `npm run build -w web` | Web app only |
| `npm run start -w web` | Test production server locally after `build` |

### Environment & Infisical

| Command | When to run |
|---------|-------------|
| `npm run env:pull -w web` | First setup, after Infisical secret changes, new machine |
| `npm run env:pull -w ops` | Same, for ops console secrets |
| `npm run env:pull -w customer-web` | Same, for customer app URL vars |
| `npm run env:pull -w api` | Same, for business API secrets |
| `npm run env:pull -w ops-mobile` | Maps `EXPO_PUBLIC_*` for Expo ops |
| `npm run env:pull -w customer-mobile` | Maps `EXPO_PUBLIC_*` for customer Expo (no Clerk) |
| `npm run env:pull` | Pull all workspaces in one command |
| `npm run env:check -w api` | Verify Clerk + DATABASE_URL + API vars |
| `npm run env:check -w web` | Debug “DATABASE_URL not set”, before migrate/seed |
| `npm run env:check -w ops` | Verify Clerk + DATABASE_URL for ops |
| `npm run env:check -w customer-web` | Verify URL env vars for app (optional keys) |
| `npm run dev -w api` | Business API only (port 3003) |
| `npm run dev -w ops` | Ops console only (port 3001) — start api too for CRUD |
| `npm run dev -w customer-web` | Customer app only (port 3002) |
| `infisical secrets --env=dev` | Inspect secrets without writing `.env.local` |

### Prisma (main backend — forms)

| Command | When to run |
|---------|-------------|
| `npm run db:push -w web` | **Only** on empty DB or greenfield Prisma — **not** after Payload tables exist |
| `npm run db:pull -w web` | Introspect remote DB into `schema.prisma` (rare, team agreement) |
| `npm run db:migrate -w web` | When `prisma/migrations` exist and you change Prisma schema |
| `npx prisma generate` (in `apps/web`) | After schema change; also runs in `build` |

Schema: [`apps/web/prisma/schema.prisma`](../apps/web/prisma/schema.prisma). Config: [`apps/web/prisma.config.ts`](../apps/web/prisma.config.ts).

### Payload (CMS only)

| Command | When to run |
|---------|-------------|
| `npm run payload:migrate -w web` | Apply CMS migrations (deploy, after pulling new `migrations/`) |
| `npm run payload:migrate:create -w web -- --name describe_change` | You changed `collections/` or Payload fields |
| `npm run generate:types -w web` | After collection schema changes |
| `npm run generate:importmap -w web` | After adding Payload plugins/admin components — **always use this script**, not raw `payload generate:importmap` |
| `npm run verify:importmap -w web` | CI/debug; fails if Vercel Blob client stub missing |
| `npm run payload -w web -- <args>` | Advanced CLI (`migrate`, `generate:types`, etc.) |

`dev` and `prebuild` run `fix-importmap` automatically. If admin shows `worker_threads` / `child_process` errors, run `npm run generate:importmap -w web` and restart dev. Details: [HELP-CMS.md](./HELP-CMS.md#payload-admin-build-worker_threads--child_process).

### Mobile (Expo)

Full guide: [MOBILE-BUILDS.md](./MOBILE-BUILDS.md) — local dev, debug APKs, EAS preview APKs, OTA updates, keystores.

| Command | When to run |
|---------|-------------|
| `npm run dev -w ops-mobile` | Daily ops mobile dev (Metro :8081) |
| `npm run dev -w customer-mobile` | Daily customer mobile dev (Metro :8082) |
| `npm run dev:all` | Web stack + both Expo apps (Turbo TUI) |
| `npm run env:pull -w ops-mobile` | Clerk + API vars for ops Expo |
| `npm run env:pull -w customer-mobile` | API vars for customer Expo |
| `npm run mobile:assets:sync` | Regenerate icons/splash from `assets/brand/` |
| `npm run mobile:apk:local:ops` | Local debug APK for ops (needs Metro — dev only) |
| `npm run mobile:apk:local:customer` | Local debug APK for customer (needs Metro — dev only) |
| `npm run mobile:apk:eas:ops` | **EAS cloud preview APK** for ops — share with team |
| `npm run mobile:apk:eas:customer` | **EAS cloud preview APK** for customer — share with team |
| `npm run update:preview -w ops-mobile` | Push OTA JS update to ops preview installs |
| `npm run update:preview -w customer-mobile` | Push OTA JS update to customer preview installs |

**Team APK workflow:** `npx eas-cli login` → `cd apps/ops-mobile` or `apps/customer-mobile` → `npx eas-cli build -p android --profile preview` → share download link. After first build: `npx eas-cli update:configure`, then `eas update --channel preview` for JS-only changes (no reinstall).

Per-app docs: [MOBILE-OPS.md](./MOBILE-OPS.md) · [APP-MOBILE.md](./APP-MOBILE.md)

### Seed content

| Command | When to run |
|---------|-------------|
| `npm run seed:help -w web` | Fresh CMS, reset help content, after help collection changes |
| `npm run seed:blog -w web` | Fresh blog samples (4 posts + covers), safe to re-run |

Requires `DATABASE_URL` + `PAYLOAD_SECRET`.

### Quality checks

| Command | When to run |
|---------|-------------|
| `npm run typecheck` | Before PR (includes import map verify on web) |
| `npm run typecheck -w web` | Web only |
| `npm run lint` | Before PR |
| `npm run format -w web` | Optional formatting |

### AI SEO static files

| Command | When to run |
|---------|-------------|
| `npm run generate:ai-seo -w web` | Regenerate `public/llms.txt`, `public/pricing.md` |
| (automatic) | Runs in `prebuild` before production build |

### Production build pipeline (web)

Order when building locally:

1. `npm run generate:ai-seo -w web` (via `prebuild`)
2. `tsx scripts/fix-importmap.ts` (via `prebuild`)
3. `prisma generate` + `next build --webpack`
4. `next-sitemap` (via `postbuild`)

```bash
npm run build -w web
```

---

## When to run what (cheat sheet)

| Situation | Commands |
|-----------|----------|
| **New engineer, existing team DB** | `npm run dev` (pulls secrets + starts all core apps) |
| **New empty Neon database** | Scenario A above |
| **Pulled git with new `apps/web/migrations/`** | `payload:migrate` → `dev` |
| **Changed Payload collection fields** | `payload:migrate:create` → `payload:migrate` → `generate:types` → `generate:importmap` |
| **Changed Prisma models** | Team process for `db:push` vs `migrate` — do not destroy CMS tables |
| **Admin webpack error (`worker_threads`)** | `generate:importmap` → restart `dev` |
| **Blog/help empty locally** | `seed:blog`, `seed:help` |
| **Form saves fail** | API running on `:3003`? Check `NEXT_PUBLIC_API_URL`, `npm run env:check -w api` |
| **Ops CRUD fails** | API + Clerk keys on api Vercel project; `NEXT_PUBLIC_API_URL` on ops build |
| **CORS errors on forms** | `API_CORS_ORIGINS` includes `http://localhost:3000` |
| **Emails not sending** | `resend_api_key` on **api** app, not web |
| **Before opening a PR** | `typecheck`, `lint`, `build -w web` |
| **Deploy to Vercel** | Set env vars; run `payload:migrate` against production DB once per schema release |

---

## Local URLs & API routes

### Marketing

- `/`, `/drivers`, `/partner-fleet`, `/start-campaign`, `/media-kit`, `/products-solutions`, `/pricing`, …

### CMS (Payload)

- `/help`, `/help/[slug]`, `/blog`, `/blog/[slug]`
- `/admin` — content editors

### APIs (do not confuse)

| Path | Stack |
|------|--------|
| `api.admobihq.com/v1/public/*` | **Business API** — marketing form POSTs (Prisma + Resend) |
| `api.admobihq.com/v1/*` | **Business API** — ops admin CRUD (Clerk + Prisma) |
| `admobihq.com/api/*` under Payload route group | **Payload REST** — CMS only |

See [API.md](./API.md) and [DATA-LAYER.md](./DATA-LAYER.md).

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `DATABASE_URL is not set` | `env:pull` or create `apps/web/.env.local` |
| `db:push` wants to drop `help_*` tables | **Stop** — use Scenario B; never push over CMS |
| Payload migrate fails | `env:check`; confirm DB reachable; SSL URL from Neon |
| `/admin` build error `worker_threads` | `npm run generate:importmap -w web`; use `dev` not raw `next dev` |
| `/help` or `/blog` empty but `/admin` works | Posts are **drafts** — click **Publish** in admin; or preview DB has no seed (run `seed:*` against that `DATABASE_URL`); preview may cache empty pages for up to 1h (`revalidate = 3600`) — redeploy or wait |
| Import map reverted in git | Run `generate:importmap`; commit stub import if intentional |
| Next “wrong workspace root” warning | Extra `package-lock.json` outside repo — see `outputFileTracingRoot` in `next.config.mjs` |
| Prisma client out of date | `cd apps/web && npx prisma generate` |
| **Form saves fail** | API running on `:3003`? Check `NEXT_PUBLIC_API_URL`, `npm run env:check -w api` |
| **Ops CRUD fails** | API running; `NEXT_PUBLIC_API_URL` set on ops; Clerk on api project |
| **CORS errors on forms** | `API_CORS_ORIGINS` includes `http://localhost:3000` on api |
| **Emails not sending** | `resend_api_key` on **api** app, not web |
| **Media upload fails in admin** | Set `BLOB_READ_WRITE_TOKEN` on web |

---

## Related documentation

| Doc | Contents |
|-----|----------|
| [API.md](./API.md) | Business API routes, Infisical, deployment |
| [DATA-LAYER.md](./DATA-LAYER.md) | Prisma = backend, Payload = CMS; migration rules |
| [OPS-ADMIN.md](./OPS-ADMIN.md) | Ops console |
| [APP.md](./APP.md) | Customer app scaffold |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel, Infisical, four projects |
| [HELP-CMS.md](./HELP-CMS.md) | Help center, Payload migrations, admin build |
| [BLOG-CMS.md](./BLOG-CMS.md) | Blog subdomain, media, seed posts |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Repo layout, all apps, CI |
