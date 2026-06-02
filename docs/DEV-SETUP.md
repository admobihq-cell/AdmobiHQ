# Local development setup

Command reference for running **Admobi** locally: Next.js marketing site, **Prisma** (leads/drivers/fleet), and **Payload** CMS (help, blog, `/admin`). Run commands from the **repository root** unless noted.

**Related:** [DATA-LAYER.md](./DATA-LAYER.md) (Prisma vs Payload), [HELP-CMS.md](./HELP-CMS.md), [BLOG-CMS.md](./BLOG-CMS.md), [ARCHITECTURE.md](./ARCHITECTURE.md).

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
npm run env:pull -w web          # or maintain apps/web/.env.local manually
npm run env:check -w web
npm run dev                      # turbo → web dev server (webpack + import map fix)
```

Open:

| URL | What |
|-----|------|
| http://localhost:3000 | Marketing site |
| http://localhost:3000/admin | Payload CMS |
| http://localhost:3000/help | Help center |
| http://localhost:3000/blog | Blog |

**Prefer `npm run dev`** (webpack). Use `npm run dev:turbo -w web` only if you accept less-tested Payload + Turbopack behaviour.

---

## Environment variables

Secrets live in **`apps/web/.env.local`** (never commit). Template: [`.env.example`](../.env.example).

### Pull from Infisical (recommended on Windows)

```bash
npm run env:pull -w web
```

Writes `apps/web/.env.local` from Infisical **dev** environment.

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
| `BLOB_READ_WRITE_TOKEN` | Media uploads in `/admin` | Optional locally; needed for real uploads |
| `RESEND_API_KEY`, `SENDER_EMAIL`, `ADMIN_EMAIL` | Driver/lead confirmation emails | Form testing with email |
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
| `DATABASE_URL` | **Yes** | Neon pooled URL; Prisma + Payload at build time |
| `PAYLOAD_SECRET` | **Yes** | Same as local (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SERVER_URL` | No | Defaults to `https://admobihq.com` if unset |
| `PAYLOAD_DATABASE_URL` | No | Only if you split CMS DB in staging |
| `BLOB_READ_WRITE_TOKEN` | No | Omit if you do not need Blob plugin paths in CI build |
| `API_KEY_PEXELS` | No | Admin image search only |
| `RESEND_API_KEY`, `SENDER_EMAIL`, `ADMIN_EMAIL`, `TEST_RECIPIENT_EMAIL` | No | Email routes; not required for build |
| `REDIS_URL` | No | Email queue; not required for build |

A **Verify required secrets** step fails fast with an annotation if `DATABASE_URL` or `PAYLOAD_SECRET` is missing.

After `prisma generate`, CI runs **`npm run cms:bootstrap:ci -w web`**, which:

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
| `npm run dev` | **Every day** — from repo root (Turbo → web) |
| `npm run dev -w web` | Same, explicit workspace |
| `npm run dev:turbo -w web` | Faster HMR experiments; not the default for Payload |
| `npm run build` | Before release, CI parity, production check |
| `npm run build -w web` | Web app only |
| `npm run start -w web` | Test production server locally after `build` |

### Environment & Infisical

| Command | When to run |
|---------|-------------|
| `npm run env:pull -w web` | First setup, after Infisical secret changes, new machine |
| `npm run env:check -w web` | Debug “DATABASE_URL not set”, before migrate/seed |
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
| **New engineer, existing team DB** | `env:pull` → `env:check` → `dev` |
| **New empty Neon database** | Scenario A above |
| **Pulled git with new `apps/web/migrations/`** | `payload:migrate` → `dev` |
| **Changed Payload collection fields** | `payload:migrate:create` → `payload:migrate` → `generate:types` → `generate:importmap` |
| **Changed Prisma models** | Team process for `db:push` vs `migrate` — do not destroy CMS tables |
| **Admin webpack error (`worker_threads`)** | `generate:importmap` → restart `dev` |
| **Blog/help empty locally** | `seed:blog`, `seed:help` |
| **Form saves fail** | Check `DATABASE_URL`, Prisma tables exist, `env:check` |
| **Media upload fails in admin** | Set `BLOB_READ_WRITE_TOKEN` |
| **Emails not sending** | `RESEND_API_KEY`, `SENDER_EMAIL`, `TEST_RECIPIENT_EMAIL` |
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
| `/api/drivers`, `/api/leads`, `/api/media-kit`, `/api/waitlist` | **Prisma** + Zod ([`app/api/`](../apps/web/app/api/)) |
| `/api/*` under Payload route group | **Payload REST** ([`app/(payload)/api/`](../apps/web/app/(payload)/api/)) |

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

---

## Related documentation

| Doc | Contents |
|-----|----------|
| [DATA-LAYER.md](./DATA-LAYER.md) | Prisma = backend, Payload = CMS; migration rules |
| [HELP-CMS.md](./HELP-CMS.md) | Help center, Payload migrations, admin build |
| [BLOG-CMS.md](./BLOG-CMS.md) | Blog subdomain, media, seed posts |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Repo layout, components, CI |
