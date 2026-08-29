# Business API (`apps/api`)

Dedicated REST API at **`api.admobihq.com`** for marketing form submissions, ops admin CRUD, and the first customer/driver self-service routes. Full handler inventory: [FEATURE-INVENTORY.md §1.2](../shared/FEATURE-INVENTORY.md#12-appsapi--business-api-route-handlers-only-no-ui). Auth: [AUTH.md](../shared/AUTH.md).

**Deployment:** [DEPLOYMENT.md](../shared/DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](../shared/DEV-SETUP.md) · **Data model:** [DATA-LAYER.md](../shared/DATA-LAYER.md)

## URLs

| Environment | Base URL | Health check |
|-------------|----------|--------------|
| Production | `https://api.admobihq.com` | `GET /v1/health` |
| Staging | `https://api.staging.admobihq.com` | same |
| Local dev | `http://localhost:3003` | same |

There is **no admin dashboard** on this host — only a minimal info page at `/` and JSON endpoints under `/v1`.

## Route map

~65 `route.ts` handlers under `/v1`. Grouped by auth, not every `[id]`/`bulk` variant:

| Path | Auth | Purpose |
|------|------|---------|
| `GET /v1/health` | None | Smoke test |
| `GET /v1/public/config` | None (rate-limited) | Platform flags (`deliveries`, …) |
| `POST /v1/public/leads` | None (CORS) | Campaign + fleet partner forms |
| `POST /v1/public/drivers` | None | Driver enrollment |
| `POST /v1/public/waitlist` | None | Waitlist signup |
| `POST /v1/public/media-kit` | None | Media kit request |
| `GET /v1/public/announcements` | None | Public announcement poll |
| `POST /v1/public/push-tokens`, `/v1/public/driver-push-tokens` | None | Expo push-token registration |
| `POST /v1/public/support`, `/v1/public/support/[id]/messages` | Identity token (see below) | Customer/driver support cases |
| `/v1/leads`, `/v1/fleet`, `/v1/drivers`, `/v1/waitlist`, `/v1/media-kit` | Ops Clerk JWT | Ops admin CRUD (+ `[id]`, `bulk`) |
| `/v1/driver-applications` | Ops Clerk JWT | Onboarding review (documents via driver instance) |
| `GET /v1/stats`, `GET /v1/audit`, `GET /v1/me` | Ops Clerk JWT | Dashboard stats, activity trail, current user |
| `GET/PATCH /v1/flags` | Ops Clerk JWT | Platform flags (write); public read is `/v1/public/config` |
| `/v1/users` | Ops Clerk JWT | Platform user search (ops Users page) |
| `/v1/team`, `/v1/roles` | Ops Clerk JWT (admin) | Staff invites + custom RBAC |
| `GET/POST/PATCH /v1/support` | Ops Clerk JWT | Ops support console |
| `POST /v1/notifications/broadcast` | Ops Clerk JWT **or** `CRON_SECRET` | Push announcement (optional `image_url`) |
| `POST /v1/notifications/broadcast-image` | Ops Clerk JWT | Upload announcement image (Vercel Blob) |
| `/v1/customer/announcements`, `/v1/customer/mobile-announcements` | Customer Clerk JWT | Advertiser inboxes (+ `/read`) |
| `/v1/driver/profile`, `/v1/driver/documents`, `/v1/driver/notifications`, `/v1/driver/announcements`, `/v1/driver/mobile-announcements` | Driver Clerk JWT | Driver self-service |
| `GET/POST /v1/push-receipts/check` | Ops JWT **or** `CRON_SECRET` | Expo receipt reconciliation |

**Payload CMS REST** stays on the web app: `admobihq.com/api/*` (catch-all under `app/(payload)/api/`).

## Who calls this API

| Client | Base URL env | Auth |
|--------|--------------|------|
| Web marketing forms | `NEXT_PUBLIC_API_URL` | None (public routes) |
| Ops console UI | `NEXT_PUBLIC_API_URL` | Ops Clerk session JWT (Bearer) |
| Ops mobile | `EXPO_PUBLIC_API_URL` | Ops Clerk session JWT |
| Customer web | `NEXT_PUBLIC_API_URL` | Customer Clerk JWT when `AUTH_ENABLED` |
| Customer mobile | `EXPO_PUBLIC_API_URL` | Customer Clerk JWT when `AUTH_ENABLED` |
| Driver web | `NEXT_PUBLIC_API_URL` | Driver Clerk JWT when `AUTH_ENABLED` |
| Driver mobile | `EXPO_PUBLIC_API_URL` | Driver Clerk JWT when `AUTH_ENABLED` |

Shared typed client: [`packages/ops-api-client`](../../packages/ops-api-client/src/index.ts) (`createOpsClient`, `publicApiUrl`).

## Auth helpers

Every protected route uses a two-line helper instead of repeating a try/catch around the verifier:

```ts
const auth = await requireOpsAccess()       // ops instance
const auth = await requireCustomerAccess()  // customer instance
const auth = await requireDriverAccess()     // driver instance
if (auth.error) return auth.error
const { access } = auth // access.userId, access.email
```

Defined in [`apps/api/lib/api-utils.ts`](../../apps/api/lib/api-utils.ts). Use the matching helper for the actor; do not verify a customer/driver token with `CLERK_SECRET_KEY`. Full instance layout: [AUTH.md](../shared/AUTH.md).

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
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Ops Clerk app |
| `CLERK_SECRET_KEY` | Yes | Validates ops admin routes |
| `CLERK_ORG_ID` | Yes | Ops organization membership gate |
| `CUSTOMER_CLERK_SECRET_KEY` | Yes | Validates `/v1/customer/*` (must not equal the ops or driver secrets) |
| `DRIVER_CLERK_SECRET_KEY` | Yes | Validates `/v1/driver/*` (must not equal the ops or customer secrets) |
| `NEXT_PUBLIC_API_URL` | Yes | Canonical API origin (no trailing slash) |
| `API_CORS_ORIGINS` | Yes | Comma-separated allowed browser/Expo origins (include driver-web `:3004` and driver-mobile `:8083` in local lists) |
| `resend_api_key` | For emails | Moved from web |
| `SENDER_EMAIL`, `ADMIN_EMAIL` | For emails | Form confirmation + alerts |
| `REDIS_URL` | Optional | Bull **email queue** (not rate limiting) |
| `CRON_SECRET` | For scheduled/system callers | See [Service-to-service auth](#service-to-service-auth) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | For rate limiting | Sliding-window limiter on `/v1/public/*` — see [Rate limiting](#rate-limiting) |

### Pull locally

```bash
npm run env:pull -w api
npm run env:check -w api
npm run dev -w api          # http://localhost:3003
```

Or start everything (pull + web + api + ops + customer-web + driver-web):

```bash
npm run dev
```

## Vercel

Fourth monorepo project — root directory **`apps/api`**.

Domains: `api.admobihq.com` (prod), `api.staging.admobihq.com` (staging).

**Deploy api before** redeploying web/ops/customer-web/driver-web when `NEXT_PUBLIC_API_URL` changes (build-time var).

## Clerk

Add API origins in Clerk Dashboard → Domains:

- `https://api.admobihq.com`
- `https://api.staging.admobihq.com`
- `http://localhost:3003`

Cross-origin Bearer tokens from ops, customer, and driver apps validate against these origins. Add the matching customer/driver Clerk apps' allowed origins as well (see [DEPLOYMENT.md](../shared/DEPLOYMENT.md#clerk)).

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
