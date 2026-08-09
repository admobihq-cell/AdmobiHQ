# Business API (`apps/api`)

Dedicated REST API at **`api.admobihq.com`** for marketing form submissions and ops admin CRUD.

**Deployment:** [DEPLOYMENT.md](../shared/DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](../shared/DEV-SETUP.md) · **Data model:** [DATA-LAYER.md](../shared/DATA-LAYER.md)

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
| `GET /v1/audit` | Clerk JWT | Cross-app activity trail (who did what) |
| `POST /v1/public/support`, `/v1/public/support/[id]/messages` | Identity token (see below) | Customer support cases |
| `GET/POST/PATCH/DELETE /v1/support` | Clerk JWT | Ops support console |
| `POST /v1/notifications/broadcast` | Clerk JWT **or** `CRON_SECRET` | Customer push announcement |

**Payload CMS REST** stays on the web app: `admobihq.com/api/*` (catch-all under `app/(payload)/api/`).

## Who calls this API

| Client | Base URL env | Auth |
|--------|--------------|------|
| Web marketing forms | `NEXT_PUBLIC_API_URL` | None (public routes) |
| Ops console UI | `NEXT_PUBLIC_API_URL` | Clerk session JWT (Bearer) |
| Mobile (Expo) | `EXPO_PUBLIC_API_URL` | Clerk session JWT |
| Customer app (future) | `NEXT_PUBLIC_API_URL` | TBD |

Shared typed client: [`packages/ops-api-client`](../../packages/ops-api-client/src/index.ts) (`createOpsClient`, `publicApiUrl`).

## Ops auth helper

Every ops route (Clerk JWT) uses the same two-line pattern instead of repeating a try/catch around `requireOpsUser()`:

```ts
const auth = await requireOpsAccess()
if (auth.error) return auth.error
const { access } = auth // access.userId, access.email
```

Defined in [`apps/api/lib/api-utils.ts`](../../apps/api/lib/api-utils.ts). Use this for any new ops route rather than hand-rolling the try/catch again.

## Service-to-service auth

Some routes accept `Authorization: Bearer $CRON_SECRET` as an alternative to a live Clerk session, for callers with no human attached — Vercel Cron and release scripts:

| Route | Caller |
|-------|--------|
| `GET/POST /v1/push-receipts/check` | Vercel Cron (nightly, `apps/api/vercel.json`) |
| `POST /v1/notifications/broadcast` | `scripts/notify-app-update.mjs`, run after `eas update` publishes (see [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md#ota-auto-notify)) |

Comparison is constant-time (`timingSafeEqual` in `lib/api-utils.ts`) — do not swap back to `===` on a new route using this pattern. System-triggered broadcasts are attributed to `release-bot@admobihq.com` in the audit log (`actor_type: "system"`), distinguishing them from staff-sent announcements.

## Rate limiting

All `/v1/public/*` routes (and the support reply/list routes) call `checkRateLimit(req, bucket, { limit, windowSeconds })` from `apps/api/lib/rate-limit.ts` as their first line — a sliding-window limiter backed by Upstash Redis, keyed by client IP.

**Fails open** when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are unset — requests pass through unthrottled rather than erroring, so local dev and any environment missing those vars keeps working. Confirm they're set before relying on this in production.

## Support case identity token

`GET /v1/public/support` (list a customer's own cases) requires `Authorization: Bearer <identity-token>`, not just an `email` query param — email alone is guessable. The token is minted once per email, the first time that email opens a case (`POST /v1/public/support`), and returned as `identityToken` in that response only — an email that already has one doesn't get reissued (this would silently invalidate whatever device already stored the original). See `mintIdentityTokenIfAbsent` / `verifyIdentityToken` in `apps/api/lib/support.ts`, backed by the `support_identities` table (mirrors the existing per-case `access_token_hash` model).

**Known gap:** a customer who cleared local storage before ever opening a case has no way to recover access to old cases from a new device — that needs an email-verification/magic-link flow, not yet built.

## Soft delete

`leads`, `fleet_partners`, `drivers`, `waitlist_entries`, and `media_kit_requests` all have `deleted_at`/`deleted_by_email` columns now, matching the pattern `announcement_broadcasts` already used. `DELETE` (single and bulk) sets `deleted_at` instead of removing the row; list queries filter `deleted_at: null`; a direct `GET /v1/<entity>/[id]` still resolves a deleted record (so audit-log deep links keep working). Unlike announcements, deleted rows are **hidden** from these list views by default — there's no "Deleted" badge UI for these five entities.

## Secrets (Infisical)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same Postgres as web (Prisma tables) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Same Clerk app as ops |
| `CLERK_SECRET_KEY` | Yes | Validates admin routes |
| `NEXT_PUBLIC_API_URL` | Yes | Canonical API origin (no trailing slash) |
| `API_CORS_ORIGINS` | Yes | Comma-separated allowed browser/Expo origins |
| `resend_api_key` | For emails | Moved from web |
| `SENDER_EMAIL`, `ADMIN_EMAIL` | For emails | Form confirmation + alerts |
| `REDIS_URL` | Optional | Bull email queue |
| `CRON_SECRET` | For scheduled/system callers | See [Service-to-service auth](#service-to-service-auth) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | For rate limiting | See [Rate limiting](#rate-limiting) |

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
