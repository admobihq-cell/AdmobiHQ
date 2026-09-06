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
| `GET /v1/public/config` | None (CDN + in-memory cache; rate-limited on cache miss) | Platform flags (`deliveries`, …) |
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
| `/v1/customer/announcements`, `/v1/customer/mobile-announcements` | Customer Clerk JWT | Advertiser announcement inboxes (+ `/read`) |
| `/v1/customer/notifications`, `/v1/customer/notifications/read`, `/v1/customer/notifications/[id]` | Customer Clerk JWT | Campaign lifecycle inbox (merged client-side with announcements) |
| `/v1/customer/campaigns` (+ `[id]`, `submit`, `creatives`, creative `file`) | Customer Clerk JWT | Advertiser campaign CRUD, submit-for-review, creative upload/proxy |
| `/v1/campaigns` (+ `[id]`, `review`, creative `file`) | Ops Clerk JWT + `campaigns` permission | Ops campaign list, detail, review decisions, creative proxy |
| `/v1/driver/profile`, `/v1/driver/documents`, `/v1/driver/notifications`, `/v1/driver/announcements`, `/v1/driver/mobile-announcements` | Driver Clerk JWT | Driver self-service |
| `/v1/driver/sos` (+ `[id]`, `messages`, `photos`, `location`) | Driver Clerk JWT | Driver SOS: file, track, reply, add photos, re-ping location |
| `/v1/safety-incidents` (+ `[id]`, `messages`, photo `file`) | Ops Clerk JWT + `safety` permission | Ops SOS queue, review decisions, photo proxy |
| `GET/POST /v1/push-receipts/check` | Ops JWT **or** `CRON_SECRET` | Expo receipt reconciliation |

### Driver SOS (safety incidents)

Drivers file under `/v1/driver/sos/*`; ops reviews under `/v1/safety-incidents/*` (requires the grantable `safety` permission). Every driver route resolves ownership through `loadOwnedIncident()`, which returns 404 for both "missing" and "not yours" so an id cannot be probed.

| Route | Method | Notes |
|---|---|---|
| `/v1/driver/sos` | `POST` | Files an incident. Rate limited **3 / 5 min**. Snapshots driver name + phone from `DriverProfile`. Severity is derived from `type`, never sent by the client. Fires ops push + admin email, both fire-and-forget. |
| `/v1/driver/sos` | `GET` | The caller's own incidents, newest first, capped at 50. |
| `/v1/driver/sos/[id]` | `GET` | Detail. Internal ops notes are stripped in `toDriverIncident()`, not in the route. |
| `/v1/driver/sos/[id]` | `PATCH` | **Cancel only** — the schema is a literal `"cancelled"`, so any other transition is a 400. 409 if already closed. |
| `/v1/driver/sos/[id]/messages` | `POST` | Driver reply. `internal_note` is hardcoded `false` regardless of the body. |
| `/v1/driver/sos/[id]/photos` | `POST` | Multipart, one file per call. Max 4 per incident, 8MB, JPEG/PNG/WebP. |
| `/v1/driver/sos/[id]/location` | `POST` | Re-ping. **204 with no write** if the incident is terminal or older than 6h — checked before body parsing. Writes no audit event. |
| `/v1/safety-incidents` | `GET` | Paginated queue; filters `status`, `type`, `severity`. Drops `driver_clerk_user_id` from the response. |
| `/v1/safety-incidents/[id]` | `GET` | Detail **including** internal notes. |
| `/v1/safety-incidents/[id]` | `PATCH` | Status / severity / resolution. Stamps `acknowledged_at` on the first non-`new` status only. Resolving without a note is a 400; ops cancelling is a 400. |
| `/v1/safety-incidents/[id]/messages` | `POST` | Ops reply; the only side that may set `internal_note`. |
| `/v1/safety-incidents/[id]/photos/[photoId]/file` | `GET` | Streams bytes. Matched on both ids so a photo from another incident is a 404. |

Photo bytes are private Cloudinary assets (`type: "authenticated"`) served only through the `…/file` proxy — the `cloudinary_public_id` never leaves the API. Full design: `docs/shared/SAFETY-SOS.md`.

### Campaigns (advertiser + ops)

Advertisers own campaigns under `/v1/customer/campaigns/*`. Ops reviews under `/v1/campaigns/*` (requires the grantable `campaigns` permission). Creative bytes are private Cloudinary assets (`type: "authenticated"`) streamed only through the authenticated `…/file` proxy routes — never point an `<img>`/`<video>` at Cloudinary directly.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` / `POST` | `/v1/customer/campaigns` | Customer | List own campaigns / create draft |
| `GET` / `PATCH` / `DELETE` | `/v1/customer/campaigns/[id]` | Customer | Detail / edit while editable / delete draft |
| `POST` | `/v1/customer/campaigns/[id]/submit` | Customer | Submit for review (fires email + inbox + push + ops alert) |
| `POST` | `/v1/customer/campaigns/[id]/creatives` | Customer | Multipart upload — **PNG/JPG/GIF/MP4 only**, ≤50 MB |
| `DELETE` | `/v1/customer/campaigns/[id]/creatives/[creativeId]` | Customer | Remove creative while editable |
| `GET` | `/v1/customer/campaigns/[id]/creatives/[creativeId]/file` | Customer | Stream creative bytes (owner only) |
| `GET` | `/v1/customer/campaigns/statement` | Customer | Budget statement PDF — every own campaign, its budget, an active subtotal and an all-campaigns total |
| `GET` | `/v1/customer/campaigns/[id]/proof-of-play` | Customer | Proof-of-play PDF — day-by-day delivery schedule; `409` unless the campaign is `approved` **and** dated |

Both PDFs render through Takumi (`lib/pdf/render-pdf.tsx`) into the shared
`CampaignStatementPdf` template, and return `application/pdf` with a
`Content-Disposition: attachment`. Unlike `/v1/ops/documents/export`, which
takes its rows in the request body, these query the caller's own campaigns
server-side — an advertiser must not be able to put arbitrary rows on Admobi
letterhead. Row building lives in `lib/campaign-statement.ts`.

Proof of play reports the **booked schedule**, not measured plays: no play
telemetry reaches the platform yet, so the document claims no play volume and
says so in its footnote. Every string written into a PDF stays inside Latin-1
— the bundled font has no glyph for `→` and Takumi throws on an uncovered
codepoint rather than substituting one.
| `GET` | `/v1/campaigns` | Ops `campaigns` | Paginated review queue |
| `GET` | `/v1/campaigns/[id]` | Ops `campaigns` | Detail + creatives |
| `PATCH` | `/v1/campaigns/[id]/review` | Ops `campaigns` | `approve` / `request_changes` / `reject` / `unapprove` — reason required except approve; reason is **advertiser-visible** |
| `GET` | `/v1/campaigns/[id]/creatives/[creativeId]/file` | Ops `campaigns` | Stream creative for review |

**Ownership mismatch returns 404, not 403** — otherwise campaign ids are enumerable. Flight phase (`scheduled` / `live` / `completed`) is derived from `starts_on` / `ends_on` at read time; there is no stored `live` column.

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

All `/v1/public/*` routes (plus the support reply/list routes and `POST /v1/driver/sos`, which is limited to **3 per 5 minutes** because it pages every ops device) call `checkRateLimit(req, bucket, { limit, windowSeconds })` from `apps/api/lib/rate-limit.ts` as their first line — a sliding-window limiter backed by Upstash Redis, keyed by client IP.

**Exception:** `GET /v1/public/config` serves an in-memory cache (5 minutes per isolate) before rate-limiting. Cache hits skip Redis and Neon, and responses set `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. Ops `PATCH /v1/flags` calls `invalidatePublicConfigCache()` so the next miss sees the new value. Customer/driver Next.js apps poll with `revalidate: 300`.

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
| `CLOUDINARY_URL` | For private media | Driver documents **and** campaign creatives (`apps/api/lib/private-media.ts`) |

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
