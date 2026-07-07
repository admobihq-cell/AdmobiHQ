# Deployment guide

Production and staging deployment for **Admobi** (`apps/web`), **Ops console** (`apps/ops`), and **Customer app** (`apps/app`).

**Related:** [DEV-SETUP.md](./DEV-SETUP.md), [OPS-ADMIN.md](./OPS-ADMIN.md)

---

## Domain map

| App | Vercel root | Production | Staging (`staging` branch) | Local |
|-----|-------------|------------|----------------------------|-------|
| Marketing + CMS | `apps/web` | `admobihq.com` | `staging.admobihq.com` | `:3000` |
| Ops console | `apps/ops` | `ops.admobihq.com` | `ops.staging.admobihq.com` | `:3001` |
| Customer app | `apps/app` | `app.admobihq.com` | `app.staging.admobihq.com` | `:3002` |

Payload `/admin` stays on the web app (`admobihq.com/admin` or `staging.admobihq.com/admin`) until you add a separate CMS subdomain.

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
| `NEXT_PUBLIC_OPS_URL` | `http://localhost:3001` | `https://ops.staging.admobihq.com` | `https://ops.admobihq.com` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3002` | `https://app.staging.admobihq.com` | `https://app.admobihq.com` |
| `NEXT_PUBLIC_ALLOW_INDEXING` | (omit / `true`) | `false` | (omit / `true`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | test | test | live (recommended) |
| `CLERK_SECRET_KEY` | full test key | full test key | full live key |
| `BLOB_READ_WRITE_TOKEN` | dev | staging or shared | prod |

Pull locally:

```bash
npm run env:pull              # dev → web + ops + app .env.local
npm run env:pull:staging      # staging → web + ops + app .env.local
```

---

## Vercel — three projects

Use the **same GitHub repo** with three Vercel projects.

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

After first prod deploy: run Payload migrate + seed once if CMS is empty ([BLOG-CMS.md](./BLOG-CMS.md)).

### Project 2: Ops (`apps/ops`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/ops` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | `cd ../.. && npm run build -w ops` if default fails |

**Domains**

- Production: `ops.admobihq.com`
- Staging: `ops.staging.admobihq.com` → **`staging` branch**

**Ops env vars:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_OPS_URL`, `NEXT_PUBLIC_WEB_URL`.

### Project 3: App (`apps/app`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/app` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build Command | `cd ../.. && npm run build -w app` if default fails |

**Domains**

- Production: `app.admobihq.com`
- Staging: `app.staging.admobihq.com` → **`staging` branch**

**App env vars:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_OPS_URL` (optional cross-links). No auth secrets required until the product login phase.

Smoke check after deploy: `GET /api/health` → `{ "ok": true, "service": "admobi-app" }`.

---

## DNS (typical Vercel records)

| Host | Type | Target |
|------|------|--------|
| `@` (apex) | A / ALIAS | Vercel apex |
| `staging` | CNAME | `cname.vercel-dns.com` |
| `ops` | CNAME | `cname.vercel-dns.com` |
| `ops.staging` | CNAME | `cname.vercel-dns.com` |
| `app` | CNAME | `cname.vercel-dns.com` |
| `app.staging` | CNAME | `cname.vercel-dns.com` |

Use the exact records shown in Vercel → Domains for your project.

---

## Clerk

App: **`app_3GALZRS50nwbrWeiFLZXxsgDIid`**

**Allowed origins / redirect URLs (ops console)**

- `https://ops.admobihq.com`
- `https://ops.staging.admobihq.com`
- `http://localhost:3001`

The customer app (`apps/app`) has **no auth yet** — add app URLs here when login ships.

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
| `NEXT_PUBLIC_OPS_URL` | Ops build metadata |
| `NEXT_PUBLIC_APP_URL` | App build metadata |
| `NEXT_PUBLIC_WEB_URL` | Ops CMS link metadata |

Existing web secrets (`BLOB_READ_WRITE_TOKEN`, etc.) remain as documented in [DEV-SETUP.md](./DEV-SETUP.md).

---

## Deploy workflow

1. Push to **`staging`** → Vercel deploys preview domains with Infisical `staging` env.
2. Smoke test staging (see below).
3. Merge to **`master`** → production deploy on `admobihq.com`, `ops.admobihq.com`, and `app.admobihq.com`.

---

## Smoke tests

### Web production

- [ ] `/`, `/blog`, `/help` load
- [ ] `/admin` login works
- [ ] Form POST to `/api/leads` persists data

### Ops production

- [ ] Sign in with `@admobihq.com` at `ops.admobihq.com`
- [ ] Overview KPIs and charts load
- [ ] CRUD on one entity (e.g. leads)
- [ ] CMS link opens `{NEXT_PUBLIC_WEB_URL}/admin`

### App production

- [ ] Sidebar shell loads at `app.admobihq.com`
- [ ] Routes `/`, `/campaigns`, `/reports`, `/settings` show coming-soon states
- [ ] `GET /api/health` returns `{ ok: true }`

### Staging

Repeat on `staging.admobihq.com`, `ops.staging.admobihq.com`, and `app.staging.admobihq.com` against the staging database.

Verify staging returns `X-Robots-Tag: noindex` and does not generate a public sitemap.

---

## Manual checklist (your action)

Use this when going live:

- [ ] **Vercel:** Three projects configured (`apps/web`, `apps/ops`, `apps/app`) with domains above
- [ ] **Infisical:** `staging` + `prod` envs synced to Vercel
- [ ] **Clerk:** All ops URLs in allowed origins; live keys in prod
- [ ] **Neon:** `ops-schema-additive.sql` applied on prod (and staging)
- [ ] **GitHub:** Clerk + URL secrets added for CI

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
