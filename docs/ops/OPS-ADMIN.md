# Ops Admin Console

Internal super-admin platform at **`ops.admobihq.com`** for @admobihq.com staff.

**Deployment:** [DEPLOYMENT.md](../shared/DEPLOYMENT.md) · **API it calls:** [API.md](../api/API.md) · **Ops mobile app:** [MOBILE-OPS.md](./MOBILE-OPS.md) · **APK / OTA:** [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md)

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

Home, Overview, **Map**, Campaign Leads, Fleet Partners, Drivers, **Driver Applications**, **Campaigns**, Waitlist, Media Kit, Announcements, **SOS**, Support, **Finances**, **Activity** (audit trail), Content (CMS), **Team**, **Users** (customers / admins), Settings (flags, tour).

### SOS (driver safety incidents)

Sidebar **SOS** (permission: `safety`), placed above Support — an emergency
queue that sorts below the helpdesk is a queue nobody checks first.

The list is ordered by acknowledgement, not recency: unacknowledged incidents
float to the top regardless of the active sort, a live clock counts up beside
each one and turns red past `ACK_TARGET_SECONDS` (5 min), and a red banner
counts them. It polls every 15s while anything is live, 60s when quiet.

| Action | Effect | Driver-visible? |
|--------|--------|-----------------|
| Acknowledge | Stamps `acknowledged_at` + reviewer email (first time only) | **Yes** — notification row |
| Mark in progress | Status → `in_progress` | Thread entry |
| Resolve | Status → `resolved`; **resolution note required** | **Yes** — note is shown to them |
| Cancel | Not available to ops — only the driver can cancel | — |

Detail view: driver card with `tel:` and WhatsApp links, coordinates plus a
Google Maps link, the photo gallery (served through the authenticated proxy),
and a thread supporting **internal notes** the driver never sees. Full design:
`docs/shared/SAFETY-SOS.md`.

### Campaigns (advertiser review)

Sidebar **Campaigns** (permission: `campaigns`) — list + detail for advertiser submissions. Pending badge counts `status: "submitted"` (same generalized `pendingCounts` map as Driver Applications).

| Decision | Effect | Advertiser-visible reason? |
|----------|--------|----------------------------|
| Approve | Status → `approved`; flight phase derived from dates | No |
| Request changes | Status → `changes_requested`; campaign editable again | **Yes** — required |
| Reject | Status → `rejected` | **Yes** — required |
| Unapprove | Walks an approval back (with reason) | **Yes** |

Creative tiles use the authenticated ops file proxy (image lightbox / `<video controls>`) and show `checkCreativeDimensions` compliance. Do not confuse with **Campaign Leads** (marketing `/start-campaign` form) — that is a different entity and alert type (`campaign` vs `campaign_submission`).

### Advertiser orgs

Sidebar **Advertiser orgs** (permission: `campaigns`) — directory of `AdvertiserOrg` rows plus detail: active members and roles, pending invitations, org campaigns (links into Campaigns detail), and the same allowlisted activity projection advertisers see. Campaign detail **Company** links here when `org_id` is set.

### Activity / audit

Ops web **Activity** (`/activity`) and ops-mobile Activity list events from `GET /v1/audit`.

- Rows are written by the API after successful mutations (ops CRUD, bulk, broadcasts) and public form submissions.
- Each event stores `app`, `actor_type`, `actor_email`, `action`, `entity_type`, `summary`, and `created_at`.
- Apply the table with `npm run db:ops-schema -w web` (see [`ops-schema-additive.sql`](../../apps/web/prisma/scripts/ops-schema-additive.sql)).
- Future customer apps: record from API handlers via `recordAuditEvent` — never from the client. Details in [DATA-LAYER.md](../shared/DATA-LAYER.md).

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
npm run dev                      # web + api + ops + customer-web + driver-web
```

## Local development

```bash
npm install
npm run dev                      # pulls secrets + starts web, api, ops, customer-web, driver-web
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

Also add **API origins** in Clerk (see [API.md](../api/API.md)) so cross-origin JWT calls from the ops UI to `api.admobihq.com` work in production.

## Vercel deployment

Full checklist: [DEPLOYMENT.md](../shared/DEPLOYMENT.md).

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
