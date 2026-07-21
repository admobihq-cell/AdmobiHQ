# Business API (`apps/api`)

Dedicated REST API at **`api.admobihq.com`** for marketing form submissions and ops admin CRUD.

**Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](./DEV-SETUP.md) · **Data model:** [DATA-LAYER.md](./DATA-LAYER.md)

## URLs

| Environment | Base URL | Health check |
|-------------|----------|--------------|
| Production | `https://api.admobihq.com` | `GET /v1/health` |
| Staging | `https://api.staging.admobihq.com` | same |
| Local dev | `http://localhost:3003` | same |

There is **no admin dashboard** on this host — only a minimal info page at `/` and JSON endpoints under `/v1`.

## Route map

| Path | Auth | Purpose |
|------|------|---------|
| `POST /v1/public/leads` | None (CORS) | Campaign + fleet partner forms |
| `POST /v1/public/drivers` | None | Driver enrollment |
| `POST /v1/public/waitlist` | None | Waitlist signup |
| `POST /v1/public/media-kit` | None | Media kit request |
| `GET/POST/PATCH/DELETE /v1/leads` | Clerk JWT | Ops admin CRUD |
| `/v1/fleet`, `/v1/drivers`, `/v1/waitlist`, `/v1/media-kit` | Clerk JWT | Same pattern (+ `[id]`, `bulk`) |
| `GET /v1/stats` | Clerk JWT | Dashboard stats for ops/mobile |

**Payload CMS REST** stays on the web app: `admobihq.com/api/*` (catch-all under `app/(payload)/api/`).

## Who calls this API

| Client | Base URL env | Auth |
|--------|--------------|------|
| Web marketing forms | `NEXT_PUBLIC_API_URL` | None (public routes) |
| Ops console UI | `NEXT_PUBLIC_API_URL` | Clerk session JWT (Bearer) |
| Mobile (Expo) | `EXPO_PUBLIC_API_URL` | Clerk session JWT |
| Customer app (future) | `NEXT_PUBLIC_API_URL` | TBD |

Shared typed client: [`packages/ops-api-client`](../packages/ops-api-client/src/index.ts) (`createOpsClient`, `publicApiUrl`).

## Secrets (Infisical)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same Postgres as web (Prisma tables) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Same Clerk app as ops |
| `CLERK_SECRET_KEY` | Yes | Validates admin routes |
| `NEXT_PUBLIC_API_URL` | Yes | Canonical API origin (no trailing slash) |
| `API_CORS_ORIGINS` | Yes | Comma-separated allowed browser/Expo origins |
| `RESEND_API_KEY` | For emails | Moved from web |
| `SENDER_EMAIL`, `ADMIN_EMAIL` | For emails | Form confirmation + alerts |
| `REDIS_URL` | Optional | Bull email queue |

### Pull locally

```bash
npm run env:pull -w api
npm run env:check -w api
npm run dev -w api          # http://localhost:3003
```

Or start everything (pull + web + api + ops + app):

```bash
npm run dev
```

## Vercel

Fourth monorepo project — root directory **`apps/api`**.

Domains: `api.admobihq.com` (prod), `api.staging.admobihq.com` (staging).

**Deploy api before** redeploying web/ops/app when `NEXT_PUBLIC_API_URL` changes (build-time var).

## Clerk

Add API origins in Clerk Dashboard → Domains:

- `https://api.admobihq.com`
- `https://api.staging.admobihq.com`
- `http://localhost:3003`

Cross-origin Bearer tokens from ops and mobile validate against these origins.

## Smoke tests

```bash
# Health (no auth)
curl http://localhost:3003/v1/health

# Admin route without token → 401
curl http://localhost:3003/v1/leads

# Public waitlist (needs valid JSON body)
curl -X POST http://localhost:3003/v1/public/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```
