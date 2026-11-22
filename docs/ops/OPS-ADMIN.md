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

Ops is **UI-only** for CRUD — entity list/edit/delete calls go to `NEXT_PUBLIC_API_URL/v1/*` via `@workspace/ops-api-client`. Two exceptions read or write Postgres directly through Prisma in `apps/ops`: server-rendered Overview stats (read-only), and the integrations ledger (admin-only server actions, see below).

### Routes (dashboard)

**Overview is the landing page.** Sign-in, `/` and `/home` (a permanent redirect for old bookmarks) all land on `/overview`: a photo greeting, the range picker, the stats and the action queue, then "Where to next" cards. It is the one console page with no permission guard, because every guarded page redirects there when you lack its permission. Instead, each section is cut to your permissions on the server before it reaches the browser ([`overview-scope.ts`](../../apps/ops/components/overview/overview-scope.ts)): a form's tile and By-type bar need that form's permission (`leads`, `fleet`, `drivers`, `waitlist`, `media_kit`), budget mix needs `leads`, drivers by city needs `drivers`, the submissions-over-time chart needs all five (it is one combined query), CMS health needs `content`, booked budget needs `campaigns` and `finances`, and the action queue and module cards show only the sections you can open. Every other page checks its permission: detail pages (`/support/[id]`, `/driver-applications/[id]`) use their list page's, **Map** needs `drivers` (same as the Fleet dashboard), and Team and Users are admin-only. Settings → Tour is the only other unguarded page, because it holds only your own tour preference.

Overview, **Map**, Campaign Leads, Fleet Partners, Drivers, **Driver Applications**, **Campaigns**, **Advertiser orgs**, Waitlist, Media Kit, Announcements, **SOS**, Support, **Finances** (real data from the wallet ledger, payouts and the integrations list, in seven tabs: Overview, Needs attention, Ledger, Wallets, Payouts, Paystack, Tool costs; the **Paystack** tab is the Paystack dashboard inside ops, read live (never cached) through `/v1/ops/paystack/*`: transfer balance, money waiting to settle, collected volume and count for the period; Transactions (every status, with Paystack's reason on failures, find by exact reference or payer email, and an **In Admobi** column: In Admobi, Not credited with a **Sync** button that runs `settlePayment`, or Not an Admobi payment), Settlements (collected, fees, paid out), Transfers (each linked to its payout, or flagged as sent outside Admobi), Refunds (Debited, or Not recorded), Disputes (with the respond-by date); **Sync refunds** imports refunds made in the Paystack dashboard straight away instead of waiting for the nightly run (a dashboard refund skips the "only what's available" check, so if one leaves the org's available balance below zero ops gets an emailed finance alert; refund from Admobi instead), and **Export transactions** opens Paystack's CSV; needs the `finances` permission, and the money stays off the page for anyone without it; the sidebar item carries a badge counting settled Paystack payments nobody has looked at yet (`payments.ops_seen_at` is null); opening the **Ledger** tab stamps them all seen and clears it, and each settled payment also pushes to ops devices and emails `ADMIN_EMAIL`; the Overview shows the live **Paystack transfer balance** (what Paystack holds for transfers; collections Paystack settles to the bank never reach it, so top it up or use Manual Payouts settlement); **Needs attention** is its own tab, so the Overview layout doesn't shift, with payout rows opening the Payouts tab (payment amount mismatches, payments pending over an hour, failed or needs-attention refunds, failed or reversed driver payouts); the Overview has net margin less Paystack fees, **Refund** (org, amount, reason: refunds unused credit to the original M-Pesa/card payments through `POST /v1/ops/payments/refunds`) and **New payout run** (opens the Payouts tab). **Payouts** tab: **New payout run** picks a month and lists approved drivers with payout details (method and last 4 digits only); ops types amounts and **Save as pending** (`finances`); rows stay editable until sent. With the separate `payouts` permission ("Driver Payouts" in Team → Roles), ops ticks pending or failed rows and presses **Disburse**, which shows the count, total, estimated Paystack fees and the live Paystack transfer balance and is blocked when the balance is short; **Send KES {total} to {n} drivers** moves the rows to Sending and calls Paystack Transfers; the dialog then prints a receipt (one line per driver sent, estimated fees, total, and a **Not sent** list with each reason). A batch Paystack refuses (a 4xx, e.g. "third party payouts as a starter business") is reported under Not sent and the receipt is titled "Nothing was sent" or "Some payouts weren't sent" — never "Payouts sent". Failed rows show Paystack's reason under the status, in the Payouts tab and the run dialog and **Done** closes it. Failed rows get **Retry** (same reference, so Paystack can't pay twice). Status moves to Settled or Failed/Reversed from the Paystack webhook, or from the nightly check after 24 h; drivers get a push and an inbox notice either way; the record-transaction dialog has a "Refund to payer" kind for bank refunds made outside Paystack. Campaign review shows **Funded** with the held amount, or **Not funded**), **Activity** (audit trail), Content (CMS), **Team**, **Users** (customers / admins), Settings (flags, **integrations**, tour). **Notifications** (`/notifications`) is reached from the header bell rather than the sidebar: a permission-filtered attention queue of open review work and new public-form submissions.

**Dashboard loading states.** Overview, Finances and the four dashboards (`/dashboards/campaigns|fleet|advertisers|support`) each have a `loading.tsx` plus a keyed `<Suspense>` around the open tab. Both use the per-tab shapes in [`components/dashboards/dashboard-skeletons.tsx`](../../apps/ops/components/dashboards/dashboard-skeletons.tsx), built from the shared primitives in [`@workspace/ui` `dashboard/dashboard-skeletons.tsx`](../../packages/ui/src/components/dashboard/dashboard-skeletons.tsx) (hero, KPI strip, chart, list, ledger, toolbar). They mirror each tab's real card grid (hero + KPI strip, chart cards, queue, ledger) so nothing jumps when data lands. Fleet, Advertisers and Support take `money` / `safety` flags because those sections only render for viewers with the permission. Page headings live in [`dashboard-header.tsx`](../../apps/ops/components/dashboards/dashboard-header.tsx) so a page and its `loading.tsx` share one copy. Every Finances tab has its own shape (Needs attention, Ledger, Invoices & quotes, Wallets, Payouts, Paystack, Tool costs), and `LedgerSkeleton` takes `summary` / `tabs` / `actions` / `search` so it matches the `LedgerCard` it stands in for; the quote/invoice editor routes have their own `finances/documents/loading.tsx`. Change a tab's layout and its skeleton together.

**Table pagination.** `LedgerCard` (`@workspace/ui`) pages its rows itself, 25 a page with Previous/Next and a "Viewing 1–25 of 80" line, unless the caller passes a real `footer` because the list is paged on the server (Paystack, customer transactions); `note` adds context to that line. The ops `DataTable` takes `pageSize` for lists fetched whole (integrations, content drafts, team, admins); entity pages page on the server with `TablePagination`. In the Ledger, money in shows green with a `+` and money out red, in the rows and the Net tile. `Skeleton` only pulses under `prefers-reduced-motion: no-preference`.

### Search (⌘K)

The header **Search** button (or ⌘K / Ctrl+K anywhere) opens the command palette: recent picks, every page the role can open (including the finance and settings tabs), quick actions (new invoice or quote, payout run, record a transaction, new announcement, switch theme), and records from `GET /v1/ops/search`.

Typing an ID jumps straight to it: `#42` or `42` (support case, campaign, SOS, payout), `INV/2026/0001`, `inv-2026-1` or `QT 2026 12` (any separator, any case), or a payout reference (`adm-payout-…`). Anything else matches names, subjects, emails and references. `%` and `_` match literally.

Each record group needs the permission of its list screen, and admins see all: SOS (`safety`); support cases (`support`); campaigns and advertiser orgs (`campaigns`); invoices and quotes, statements and payments (`finances`); payouts (`finances` or `payouts`); driver applications (`driver_applications`); drivers (`drivers`); fleet partners (`fleet`); leads (`leads`); waitlist (`waitlist`); media kit (`media_kit`). Results show at most 5 per group. Nothing is fetched until you type, so opening the palette never wakes the database.

### Live toasts

Ops holds a live stream (`GET /v1/ops/live`). Every event refetches the affected queue and re-renders the sidebar counts. A toast appears only for what the role may see:

| Event | Toast | Needs |
|---|---|---|
| Driver SOS | "SOS reported" in amber, low tone, **stays until dismissed**, Respond → `/sos/<id>` | `safety` |
| Campaign submitted | "Campaign submitted for review", Review → `/campaigns/<id>` | `campaigns` |
| Payment settled | "Payment received", Ledger → `/finances?tab=ledger` | `finances` |
| Support case opened | "New support case", Open → `/support/<id>` | `support` |
| Driver application submitted | "New driver application", Review → `/driver-applications/<id>` | `driver_applications` |

The **Alert sound** button on `/notifications` mutes tones on this device.

### Dashboard charts

**Finances → Overview** opens with two cards:
- **Revenue** (two columns wide):
  - The revenue figure with its change and **Net margin** with a % of revenue pill.
  - A daily revenue column chart (monthly past 120 days; `trend` in `queryFinanceOverview`, filled by `bucketSeries`).
  - Tiles for Driver payouts, and for Tools and Paystack fees.
- **Cash position:** Money in with its change and a trend line, Wallet funds held, and the live Paystack transfer balance.

Below them, **Where revenue went** is a cash-flow Sankey (revenue categories → Revenue → driver payouts, Paystack fees, tools, net margin). A loss shows as a **Shortfall** source instead of a negative margin (`financeFlow` in `@workspace/ops-contracts`).

On the other dashboards:
- **Support & safety:** **When cases come in**, an activity grid of cases opened per day.
- **Fleet:** **Payouts by month** is stacked columns.
- **Funnels** use the ribbon style.

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

**Bulk review** (Campaigns and Driver Applications): tick rows, then **Approve** or **Reject** in the selection bar. A confirm step states the count. Reject asks for one reason, and every selected advertiser or driver sees it. Only rows still `submitted` change; anything already decided is skipped and counted in the toast ("2 approved, 1 skipped (not in review)"). Bulk never walks back an approval, and has no request-changes option; both stay on the detail page. Each row gets the same audit entry, notification and email as a single review.

Creative tiles use the authenticated ops file proxy (image lightbox / `<video controls>`) and show `checkCreativeDimensions` compliance. Do not confuse with **Campaign Leads** (marketing `/start-campaign` form) — that is a different entity and alert type (`campaign` vs `campaign_submission`).

### Advertiser orgs

Sidebar **Advertiser orgs** (permission: `campaigns`) — directory of `AdvertiserOrg` rows plus detail: active members and roles, pending invitations, org campaigns (links into Campaigns detail), and the same allowlisted activity projection advertisers see. Campaign detail **Company** links here when `org_id` is set, and **Created by** names the org member who authored the campaign (resolved from the retained `Campaign.clerk_user_id`). ops-mobile has the same list + detail under the drawer's **Advertiser orgs** entry.

A campaign whose `org_id` is null was detached when its org was deleted (or abandoned during invite acceptance) — it stays on the ops record for billing and reporting, but no advertiser can reach it. It will not appear under any org.

### Announcements

Compose supports merge tags `{{first_name}}` (Clerk) and `{{org_name}}` (active `AdvertiserOrg` membership). Org name is filled for customer recipients only; drivers and anonymous tokens get the tag stripped. **Personalise** buttons under the message insert a tag at the cursor of the last-focused field (title or message).

The composer ([`announcement-form-dialog.tsx`](../../apps/ops/app/(dashboard)/announcements/announcement-form-dialog.tsx)) has the form on the left and a live phone preview on the right ([`announcement-preview.tsx`](../../apps/ops/app/(dashboard)/announcements/announcement-preview.tsx)). The preview runs the same `renderAnnouncementTemplate` the API uses (now in `@workspace/ops-contracts`) with sample values “Jordan” / “Acme Ads”, and has a Customer / Driver switch when both audiences are targeted, since drivers lose `{{org_name}}`. Title and message show live counts against the push limits (65 / 178). Images can be dropped or browsed; they're cropped to 1200×600. **Review & send** opens the confirmation on top of the composer, so Cancel returns to the draft.

Clicking a row's message or the eye icon opens the detail view ([`announcement-detail-dialog.tsx`](../../apps/ops/app/(dashboard)/announcements/announcement-detail-dialog.tsx)): the same preview at the sent time, the raw template when it used merge tags, a delivery bar (reached / device no longer registered / awaiting a receipt, out of `target_count`), status, type, audience, and Delete / Resend.

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

### List page toolbar

Every ops list page uses the same toolbar, from `components/ui/table-toolbar.tsx`: a search box, the page's filters, an **Export** menu, and page actions (e.g. **Add**). Ticking rows (`lib/use-row-selection.tsx`) shows a bar with the count, the page's bulk actions, **Export selected**, and clear. Changing the page, page size, search or any filter clears the selection, so rows you can't see are never exported or acted on. **Team → Roles** is the exception: it's an editable permission matrix (rows are permissions, cells are per-role checkboxes), so it has search and export but no row selection. **Notifications** is a feed, not a table, and has neither.

### Exports

List pages export either the **visible page** (toolbar **Export**) or the **selected rows** (**Export selected**) in three formats, via `exportTableRows()` in `lib/table-export.ts`. The columns are each page's export columns (on `EntityPage`, those with a `csv` accessor), and filenames come from `exportFileName()`. This is never a full-dataset export.

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
| Overview stats | Prisma direct (server components) | Read-only |
| Integrations ledger | Prisma direct (server actions, admin-only) | Full CRUD |
| Blog, help, media | Payload (Postgres) | Read-only overview; edit at `/admin` |

Public form POSTs go to `api.admobihq.com/v1/public/*`. Ops admin routes require Clerk + `@admobihq.com`.

## Env check

```bash
npm run env:check -w ops
```

### Invoices & quotes (Finances > Invoices & quotes)

Ops writes quotes and invoices by hand for work billed **outside the Paystack wallet**: bank transfer, M-Pesa paybill, cheque or cash. Open the tab for the list (outstanding and overdue totals, filters, search), then **New** opens the editor at `/finances/documents/new`. The form is on the left, and the live A4 preview on the right is the real PDF the advertiser will download, re-rendered about 0.6 s after you stop typing. The preview renders from the first keystroke: until the form is complete, blank or invalid fields are filled with placeholders ("Customer name", "Item description", today's date, clamped numbers) for the preview only, and a note above the page says so. Saving still validates every field. Needs the `finances` permission.

- **Customer:** pick an advertiser organization. That fills the name, billing email and KRA PIN, and the campaign picker lists only that org's campaigns. Tick **Not a customer yet** to type a prospect's details instead; those documents are never visible in any advertiser app.
- **Numbers:** `QT/2026/0001` and `INV/2026/0001`, assigned on first save from a per-kind, per-year counter. They can't be edited, never repeat, and never look like the Paystack receipts (`INV-2026-000123`). A numbered document is never deleted, only voided, so the sequence stays gapless.
- **Money:** subtotal, then discount %, then tax % on the taxable lines after discount, then the extra fee. The server always recomputes the totals; whatever the browser sends is ignored.
- **Lifecycle:** a draft is editable. **Mark as sent** locks it, makes it visible to the advertiser in Billing, and emails the PDF to the customer address on the document (the org's billing email, or what you typed for a prospect). If there's no address or the email fails, the send still goes through and the toast says so. A sent quote can be marked accepted or declined, or **converted to invoice**, which creates a new draft invoice with its own `INV/` number. Any document, including a saved draft, can be **voided**, which retires its number without showing it to anyone; to change a sent document, void it and issue a new one. Percentages and amounts take at most 2 decimals.
- **Payments:** **Record payment** on a sent invoice takes amount, method, reference and date. Payments are append-only and audited, and can't exceed the balance. They **never touch the advertiser's wallet** or the finance revenue figures. Paid, part-paid and overdue are worked out from the payments, never stored. The PDF carries a red **UNPAID** or **OVERDUE** pill, amber **PART-PAID**, green **PAID**, or grey **VOID** / **DRAFT**.
- **Company details:** Admobi's name, contact lines, KRA PIN and the default note, payment instructions and terms live in `apps/api/lib/billing/company.ts`. The KRA PIN and bank/paybill details are still placeholders (`TODO(user)`).

### Record transaction (Finances > Ledger)

Ops can add a wallet ledger row by hand: organization, type (top-up, spend, refund or adjustment), amount, optional campaign, category, optional reference and a reason. Nothing else writes the ledger on prod yet, so this is how an account manager adds funds after a payment arrives, which is what the advertiser app tells people to ask for.

- **Sign:** enter a positive amount for a top-up, spend or refund and the type sets the sign. An adjustment is entered signed (negative takes money out).
- **Rules:** zero is refused, spend and refunds need a category, a reference can only be used once, and a campaign must belong to the chosen organization.
- **Append-only:** there is no edit or delete. A mistake is corrected with an adjustment, and every entry is audited (Activity) with who recorded it. Rows are marked `provider = manual`.
- **Numbers:** revenue is spend net of refunds, tax left out. "Wallet funds held" is money owed to advertisers, not revenue. Tool costs are today's monthly run-rate from Integrations, scaled to the period, because that list keeps no history. Pages are cached for five minutes, and recording a transaction refreshes them straight away.

