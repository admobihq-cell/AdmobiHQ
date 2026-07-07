# Ops Admin Console

Internal super-admin platform at **`ops.admobihq.com`** for @admobihq.com staff.

**Deployment:** see [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel, Infisical staging/prod, Clerk, and DNS.

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://ops.admobihq.com` |
| Staging | `https://ops.staging.admobihq.com` |
| Local dev | `http://localhost:3001` |
| Marketing site | `https://admobihq.com` |
| Payload CMS | `https://admobihq.com/admin` |

## Secrets (Infisical)

All environment variables live in **Infisical**, not in the repo. Same pattern as `apps/web`.

### One-time

```bash
infisical login
cd apps/web   # or repo root — links .infisical.json
infisical init
```

### Add these keys in Infisical (dev + prod)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same Postgres as web (Prisma + content stats) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk app `app_3GALZRS50nwbrWeiFLZXxsgDIid` |
| `CLERK_SECRET_KEY` | Yes | Server-only; never expose to client |
| `NEXT_PUBLIC_OPS_URL` | Recommended | `http://localhost:3001` (dev), `https://ops.admobihq.com` (prod) |
| `NEXT_PUBLIC_WEB_URL` | Recommended | Marketing + CMS origin for admin links (`http://localhost:3000` dev, `https://admobihq.com` prod) |

Optional: `PAYLOAD_SECRET` if you extend Payload reads later.

### Pull locally

From repo root:

```bash
npm run env:pull -w ops          # writes apps/ops/.env.local
npm run env:check -w ops
```

Or pull **web + ops + app** together:

```bash
npm run env:pull                 # root script
```

On Windows, if `infisical run` exits instantly, use **`env:pull`** and normal `npm` (see [DEV-SETUP.md](./DEV-SETUP.md)).

Inspect without writing files:

```bash
infisical secrets --env=dev
```

## Local development

```bash
npm install
npm run env:pull -w ops
npm run env:check -w ops
# Apply additive ops schema (safe — does not drop Payload tables):
npm run db:ops-schema -w web
# Or paste apps/web/prisma/scripts/ops-schema-additive.sql into Neon SQL Editor
# Do NOT paste SQL into PowerShell. Do NOT run db:push.

npm run dev -w ops                 # http://localhost:3001
```

Sign in with an `@admobihq.com` Clerk account (restrict domain in Clerk Dashboard → Restrictions).

## Clerk setup

Linked Clerk application: **`app_3GALZRS50nwbrWeiFLZXxsgDIid`**

Code is already wired (`@clerk/nextjs`, middleware, sign-in/up, `@clerk/ui` shadcn theme). Store Clerk keys in **Infisical**; `clerk init` can still link the app if you use the Clerk CLI:

```bash
clerk auth login
cd apps/ops
clerk init --app app_3GALZRS50nwbrWeiFLZXxsgDIid
clerk doctor
```

Clerk auth is **separate** from Payload CMS users at `/admin`.

## Vercel deployment

Full checklist: [DEPLOYMENT.md](./DEPLOYMENT.md).

1. Monorepo project with root directory `apps/ops`.
2. Domain: `ops.admobihq.com` (prod), `ops.staging.admobihq.com` (staging branch).
3. Env vars: sync from **Infisical** (Vercel integration) or copy the same keys as Infisical **prod** / **staging**.
4. Build: `npm run build -w ops` (no `.env.local` on Vercel — env injected by platform).

## Data access

| Data | Source | Managed in ops |
|------|--------|----------------|
| Campaign leads, fleet, drivers, waitlist, media kit | Prisma | Full CRUD |
| Blog, help, media | Payload (Postgres) | Read-only overview; edit at `/admin` |

Public form APIs stay on `admobihq.com/api/*`. Ops CRUD APIs require Clerk + `@admobihq.com`.

## Env check

```bash
npm run env:check -w ops
```
