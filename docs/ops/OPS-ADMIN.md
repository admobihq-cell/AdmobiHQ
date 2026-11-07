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

Ops is **UI-only** for CRUD — entity list/edit/delete calls go to `NEXT_PUBLIC_API_URL/v1/*` via `@workspace/ops-api-client`. Two exceptions read or write Postgres directly through Prisma in `apps/ops`: server-rendered home/overview stats (read-only), and the integrations ledger (admin-only server actions, see below).

### Routes (dashboard)

Home, Overview, **Map**, Campaign Leads, Fleet Partners, Drivers, **Driver Applications**, **Campaigns**, **Advertiser orgs**, Waitlist, Media Kit, Announcements, **SOS**, Support, **Finances** (real data from the wallet ledger, payouts and the integrations list, in five tabs: Overview, Ledger, Wallets, Payouts, Tool costs; needs the `finances` permission, and the money stays off the page for anyone without it; payout and transfer actions still open "coming soon" dialogs), **Activity** (audit trail), Content (CMS), **Team**, **Users** (customers / admins), Settings (flags, **integrations**, tour). **Notifications** (`/notifications`) is reached from the header bell rather than the sidebar: a permission-filtered attention queue of open review work and new public-form submissions.

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

Sidebar **Advertiser orgs** (permission: `campaigns`) — directory of `AdvertiserOrg` rows plus detail: active members and roles, pending invitations, org campaigns (links into Campaigns detail), and the same allowlisted activity projection advertisers see. Campaign detail **Company** links here when `org_id` is set, and **Created by** names the org member who authored the campaign (resolved from the retained `Campaign.clerk_user_id`). ops-mobile has the same list + detail under the drawer's **Advertiser orgs** entry.

A campaign whose `org_id` is null was detached when its org was deleted (or abandoned during invite acceptance) — it stays on the ops record for billing and reporting, but no advertiser can reach it. It will not appear under any org.

### Announcements

Compose supports merge tags `{{first_name}}` (Clerk) and `{{org_name}}` (active `AdvertiserOrg` membership). Org name is filled for customer recipients only; drivers and anonymous tokens get the tag stripped. Preview in the composer uses sample values “Jordan” / “Acme Ads”.

### Network map (demo fleet)

Ops web **Map** (`/map`) shows a **simulated** fleet: no GPS or screen data is wired yet, and the rail footer says so. Everything lives in [`components/maps/demo-fleet/`](../../apps/ops/components/maps/demo-fleet/):

- [`fleet.ts`](../../apps/ops/components/maps/demo-fleet/fleet.ts) — 13 made-up vehicles (taxi-tops + delivery bikes, active / idle / offline), zone geotargeting (the eleven made-up advertisers live in [`@workspace/ops-contracts` `demo-ads.ts`](../../packages/ops-contracts/src/demo-ads.ts), shared so the marketing site's products page rotates the same ads), and the simulation. Position, the ad on screen, "up next" and the play log are pure functions of wall-clock time (15 s slots), so the marker, popup and detail rail always agree. Routes in `routes.json` are real road centrelines fetched once from the public OSRM router.
- Click a vehicle (or a row in the rail) for a popup with the live 3:1 (taxi) or 1:1 (bike) screen; **Open details** swaps the rail for the vehicle: now playing, location, play log, zone rotation, screen health, driver. The camera follows the vehicle until you drag the map. Esc steps back.
- **Markets (H3)** — the six campaign-wizard markets (CBD, Westlands, Karen, Kilimani, Mombasa Rd, Eastlands) as sets of H3 resolution-8 cells from [`@workspace/geo/markets`](../../packages/geo/src/markets.ts) — the same keys as `marketZoneIds` in pricing and the same resolution as the planned audience index. A screen's zone is one cell lookup (`marketAt`); road outside every market plays the run-of-network rotation. A market pulses when a screen's next spot is booked from it.
- **Campaigns tab** — every campaign with screens showing it now and plays since 06:00. Picking one shades its booked markets' hexes in its colour (chips show each market's pricing tier), fades every vehicle not showing it, and shows plays today, est. views (illustrative: plays × a per-zone traffic factor) and the next airing when it's between spots.
- **Needs attention** (Vehicles tab) — offline screens, panels ≥ 42 °C, weak signal, firmware behind. Each row opens the vehicle.
- **Deep links** — the address bar tracks the view: `/map?vehicle=KDH-482T` opens a vehicle, `/map?campaign=savanna-air` a campaign. **Copy link** in either view copies it.
- Vehicle sprites in `public/demo-fleet/vehicles/` are Blender renders — regenerate with [`scripts/render-demo-vehicles.py`](../../apps/ops/scripts/render-demo-vehicles.py) (instructions in its header).
- Ad clips in `public/demo-fleet/ads/` are 640×360 stock footage from Pexels (free licence, no attribution required; don't redistribute the files standalone): Safari Cola ← 4465062, Pesa Mint ← 7821646, Nairobi Nights ← 3042698, Soko Fresh ← 15645011, Kahawa House ← 6950167, Mtaa Kicks ← 7644257, Savanna Air ← 11282762, Chakula Express ← 8627109, Kasi 5G ← 6754320, Fit254 ← 4367572, Tatu Heights ← 4783895 (`pexels.com/video/<id>`). Brand names and copy are drawn over them in code.
- Self-check: `npx tsx --test apps/ops/components/maps/demo-fleet/fleet.test.ts`.

When real telemetry lands, replace `poseAt` / `playAt` / `playLog` with API data — the UI only reads those.

### Activity / audit

Ops web **Activity** (`/activity`) and ops-mobile Activity list events from `GET /v1/audit`.

- Rows are written by the API after successful mutations (ops CRUD, bulk, broadcasts) and public form submissions.
- Each event stores `app`, `actor_type`, `actor_email`, `action`, `entity_type`, `summary`, and `created_at`.
- Apply the table with `npm run db:ops-schema -w web` (see [`ops-schema-additive.sql`](../../apps/web/prisma/scripts/ops-schema-additive.sql)).
- Future customer apps: record from API handlers via `recordAuditEvent` — never from the client. Details in [DATA-LAYER.md](../shared/DATA-LAYER.md).

### Exports

Every entity list page (`EntityPage`) exports the **selected rows** in three formats. The columns are those with a `csv` accessor, and filenames come from `exportFileName()`.

| Format | Built where |
|--------|-------------|
| CSV | In the browser (`toCsv` from `@workspace/ops-contracts/format`, re-exported by `lib/format.ts`) |
| XLSX | In the browser, styled header row (`buildStyledXlsx` in `lib/xlsx.ts`, `exceljs`) |
| PDF | Rows are posted to `POST /v1/ops/documents/export`, which renders the `EntityExportPdf` template with `takumi-pdf` (logo, footer, page numbers). See [API.md](../api/API.md). |

### Integrations ledger

**Settings → Integrations** (`/settings/integrations`, ops admins only via `requireOpsAdmin`) tracks every third-party tool and subscription: category, purpose, plan, cost, currency, billing cycle, status and owner. Rows live in the `Integration` table and are written by server actions in `app/(dashboard)/settings/(prefs)/integrations/actions.ts`, not through the API. The view rolls every subscription up to monthly USD and KES totals with a by-category pie chart. Exchange rates are constants in [`lib/integration-costs.ts`](../../apps/ops/lib/integration-costs.ts) (`USD_KES`, `EUR_USD`, `RATES_AS_OF`); bump them when rates move. The same file holds the seed list.

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
| Integrations ledger | Prisma direct (server actions, admin-only) | Full CRUD |
| Blog, help, media | Payload (Postgres) | Read-only overview; edit at `/admin` |

Public form POSTs go to `api.admobihq.com/v1/public/*`. Ops admin routes require Clerk + `@admobihq.com`.

## Env check

```bash
npm run env:check -w ops
```

### Record transaction (Finances > Ledger)

Ops can add a wallet ledger row by hand: organization, type (top-up, spend, refund or adjustment), amount, optional campaign, category, optional reference and a reason. Nothing else writes the ledger on prod yet, so this is how an account manager adds funds after a payment arrives, which is what the advertiser app tells people to ask for.

- **Sign:** enter a positive amount for a top-up, spend or refund and the type sets the sign. An adjustment is entered signed (negative takes money out).
- **Rules:** zero is refused, spend and refunds need a category, a reference can only be used once, and a campaign must belong to the chosen organization.
- **Append-only:** there is no edit or delete. A mistake is corrected with an adjustment, and every entry is audited (Activity) with who recorded it. Rows are marked `provider = manual`.
- **Numbers:** revenue is spend net of refunds, tax left out. "Wallet funds held" is money owed to advertisers, not revenue. Tool costs are today's monthly run-rate from Integrations, scaled to the period, because that list keeps no history. Pages are cached for five minutes, and recording a transaction refreshes them straight away.

