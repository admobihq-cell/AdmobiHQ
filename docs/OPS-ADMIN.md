# Ops Admin Console

Internal super-admin platform at **`ops.admobihq.com`** for @admobihq.com staff.

**Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md) · **API it calls:** [API.md](./API.md)

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://ops.admobihq.com` |
| Staging | `https://ops.staging.admobihq.com` |
| Local dev | `http://localhost:3001` |
| Business API | `https://api.admobihq.com` (prod), `http://localhost:3003` (local) |
| Marketing site | `https://admobihq.com` |
| Payload CMS | `https://admobihq.com/admin` |

Ops is **UI-only** for CRUD — entity list/edit/delete calls go to `NEXT_PUBLIC_API_URL/v1/*` via `@workspace/ops-api-client`. Server-rendered home/overview stats still read Postgres directly through Prisma in `apps/ops`.

### Routes (dashboard)

Home, Overview, **Map** (network corridors / active units / city anchors via mapcn), Campaign Leads, Fleet Partners, Drivers, Waitlist, Media Kit, Content (CMS).

## Secrets (Infisical)

All environment variables live in **Infisical**, not in the repo.

### One-time

```bash
infisical login
cd apps/web
infisical init
```

### Add these keys in Infisical (dev + staging + prod)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same Postgres as web — server-rendered stats/content overview |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk app `app_3GALZRS50nwbrWeiFLZXxsgDIid` |
| `CLERK_SECRET_KEY` | Yes | Server-only; ops middleware |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3003` (dev), `https://api.admobihq.com` (prod) |
| `NEXT_PUBLIC_OPS_URL` | Recommended | Ops UI origin — `http://localhost:3001` (dev), `https://ops.admobihq.com` (prod) |
| `NEXT_PUBLIC_WEB_URL` | Recommended | Marketing + CMS links |

Optional: `PAYLOAD_SECRET` if you extend Payload reads later.

### Pull locally

```bash
npm run env:pull                 # all apps (recommended)
npm run env:check -w ops
```

Or start everything with auto-pull:

```bash
npm run dev                      # web + api + ops + app
```

## Local development

```bash
npm install
npm run dev                      # pulls secrets + starts web, api, ops, app
# Or ops only (API must be running for CRUD):
npm run dev -w api & npm run dev -w ops
```

Open **http://localhost:3001**. Sign in with an `@admobihq.com` Clerk account.

Apply ops schema once on a fresh DB:

```bash
npm run db:ops-schema -w web
```

Do **not** run `db:push` on a database that already has Payload tables.

## Clerk setup

Linked Clerk application: **`app_3GALZRS50nwbrWeiFLZXxsgDIid`**

Clerk auth is **separate** from Payload CMS users at `/admin`.

Also add **API origins** in Clerk (see [API.md](./API.md)) so cross-origin JWT calls from the ops UI to `api.admobihq.com` work in production.

## Vercel deployment

Full checklist: [DEPLOYMENT.md](./DEPLOYMENT.md).

1. Monorepo project with root directory `apps/ops`.
2. Domain: `ops.admobihq.com` (prod), `ops.staging.admobihq.com` (staging branch).
3. Env vars: `CLERK_*`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_OPS_URL`, `NEXT_PUBLIC_WEB_URL`, `DATABASE_URL`, Sentry.
4. Redeploy ops whenever `NEXT_PUBLIC_API_URL` changes (build-time var).

## Data access

| Data | Source | Managed in ops UI |
|------|--------|-------------------|
| Campaign leads, fleet, drivers, waitlist, media kit | Prisma via **API** (`/v1/*`) | Full CRUD (client-side) |
| Home/overview stats | Prisma direct (server components) | Read-only |
| Blog, help, media | Payload (Postgres) | Read-only overview; edit at `/admin` |

Public form POSTs go to `api.admobihq.com/v1/public/*`. Ops admin routes require Clerk + `@admobihq.com`.

## Env check

```bash
npm run env:check -w ops
```
