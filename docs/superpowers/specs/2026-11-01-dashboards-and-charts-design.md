# Dashboards & Charts — Design

**Date:** 2026-11-01
**Status:** Awaiting review
**Scope:** `apps/ops`, `apps/customer-web`, `apps/api`, `apps/web/prisma`, `packages/ui`, `packages/ops-contracts`
**Visual reference:** [studio-admin](https://studio-admin.arhamkhnz.com/) ([source](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)), which is also shadcn + Recharts. Its live demo was down (503) throughout planning, so layouts here come from its source, not from screenshots. Re-check the demo during the build if it returns.

Related: [Media Library plan](../plans/2026-10-01-media-library.md) (tracked separately, see §8).

---

## 1. Intent

Ops and advertisers should each get several real dashboards, in the style of the reference template. Advertisers in particular should be able to see how their funds are used and where they went.

Most of the numbers don't exist yet: no payments, no payouts, no delivery data. So the dashboards are built now against **real tables and real queries**, and those tables are filled with **seeded demo rows on the dev database only**. When Pesapal and telemetry arrive they write to the same tables, and no dashboard code changes.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Sample data | Seeded rows, not hardcoded constants or a "Sample data" badge | The user's call. Exercises the real query path. |
| Where the seed runs | Dev Neon only, which serves both local and staging ([DEPLOYMENT.md](../../shared/DEPLOYMENT.md)) | One run covers both. Prod stays empty. |
| Prod behaviour | Tables exist but are empty; every chart shows an honest empty state | A made-up number on a dashboard is worse than a missing one (existing rule in `overview-view.tsx`). |
| Existing fake data | Removed from web: ops `/finances` and the advertiser wallet stop using `placeholder-data.ts`; the on-device wallet balance is deleted | Otherwise real advertisers keep seeing invented balances. |
| Chart library | Keep Recharts via `@workspace/ui` `chart.tsx`; no new dependency | Already installed; same as the reference template. |
| Shared charts | A small kit in `packages/ui` used by both apps | Ops and advertiser charts must read as one system. |
| Ops data access | `getPgPool()` + `unstable_cache` (300s) in `apps/ops/lib/queries/`, same as `stats.ts` | Existing pattern. |
| Advertiser data access | New `/v1/customer/*` routes + TanStack Query, org-scoped by `auth.access.orgId` | Existing pattern; the API is the tenant boundary. |

## 3. Data model

Three additive tables, each with `is_demo Boolean @default(false)`:

- **`WalletTransaction`** (`wallet_transactions`): append-only org ledger. `org_id?` and `campaign_id?` (both `SetNull`, so finance history outlives a deleted org or campaign), `kind` (`top_up | spend | refund | adjustment`), signed `amount_kes` (credit +, debit −), `spend_category?` (`screen_time | production | service_fee | tax`), `provider` (`manual | pesapal | seed`), `reference?` unique, `description`, `occurred_at`.
- **`CampaignDailyStat`** (`campaign_daily_stats`): one row per campaign, day and market. `impressions`, `vehicle_hours`, `distance_km`, `active_vehicles`. The future telemetry aggregation cron writes here. Unique on `(campaign_id, day, market)`. Cascades with the campaign.
- **`Payout`** (`payouts`): the model named in [ROADMAP.md](../../shared/ROADMAP.md) §3. `driver_id?` (`SetNull`), `amount_kes`, `status` (`pending | settled | failed`), `mpesa_ref?`, `period_month`, `paid_at?`.

Balance is `SUM(amount_kes)` for the org and is never stored. `CampaignDailyStat` does not replace the `campaign_placements` table reserved in [DATA-LAYER.md](../../shared/DATA-LAYER.md): that one is dispatch state, this one is delivery aggregates.

**Builder's call, confirm against the pricing doc:** the four `spend_category` values are a proposal for how an advertiser's money splits. [`docs/pricing`](../../pricing) was not reviewed in detail.

## 4. Seed

`npm run seed:demo -w api` (with an optional `--org <id>`) wipes every demo row and writes a fresh set, so re-running never double-counts.

- **Prod guard, fail closed:** the script refuses to run unless the `DATABASE_URL` host starts with an allowlisted dev prefix or is localhost. There is deliberately no `:prod` script.
- **Deterministic:** a fixed PRNG seed gives the same numbers on every run.
- **Targets existing orgs**, so a real login on local or staging sees data. Each active org gets 4 to 6 demo campaigns, 180 days of daily stats and wallet history that reconciles.
- **Ops-only rows:** demo CRM drivers, payouts, driver profiles, support cases and safety incidents, all recognisably marked (§5 of the plan) so the reset removes them and nothing else. Seed writes go straight to the DB, so no emails or push notifications fire.

## 5. Dashboards

The range picker (7D / 30D / 90D / All) from ops Overview appears on every dashboard.

### Ops

New sidebar group **Dashboards**, above Operations. Overview and Finances move into it and keep their URLs.

| Dashboard | Route | Permission | KPIs | Charts and tables |
|---|---|---|---|---|
| **Overview** (existing) | `/overview` | none | as today | as today, rebuilt on the shared kit |
| **Finance** | `/finances` | `finances` | Money in, Revenue, Driver payouts, Tool costs (monthly), Net margin, Wallet funds held | Money in vs out trend · Revenue by category (donut) · Revenue by market · Top advertisers · Payouts by status · Transactions table |
| **Campaigns** | `/dashboards/campaigns` | `campaigns` | Live, In review, Approval rate, Booked budget, Est. impressions | Status pipeline (funnel) · Submitted vs approved trend · Budget by format (donut) · Impressions by market · Impressions by weekday (heatmap) · Ending soon table |
| **Fleet** | `/dashboards/fleet` | `drivers` | Active drivers, Pending applications, Approval rate, Avg active vehicles, Vehicle hours, Payouts pending | Application funnel · Drivers by city · Active vehicles trend · Payouts by month · Top drivers by payout |
| **Support & safety** | `/dashboards/support` | `support` | Open cases, Urgent open, Opened in range, Open incidents, Critical incidents | Cases opened trend · Cases by category (donut) · Incidents by type · Incidents by severity · Oldest open cases table |

Finance keeps its existing "coming soon" action dialogs. Tool costs is a run-rate from `integrations`, which has no history, so it's a single KPI and not a trend. Net margin is revenue minus payouts in range minus tool costs scaled to the range. Wallet funds held is shown separately because it is money owed to advertisers, not revenue. The support dashboard has no response-time KPI: `support_cases` has no first-response or resolved timestamp, and `updated_at` would lie.

### Advertiser

| Dashboard | Route | Permission | KPIs | Charts and tables |
|---|---|---|---|---|
| **Overview** (existing) | `/` | `billing:read` / `reports:read` per tile | existing + Balance, Spent, Est. impressions | Spend trend · Impressions trend (two charts) |
| **Wallet** | `/settings/billing` | `billing:read` | Balance, Topped up, Spent, Committed | **Where your money went** (donut by category) · Spend by campaign · Monthly spend · Transactions table |
| **Reports** | `/reports` | `reports:read` | Est. impressions, Spend, Cost per 1,000, Vehicle hours, Distance | Impressions trend · Impressions by market · Spend by format · Impressions by weekday (heatmap) · Campaign comparison table |

Reports replaces the coming-soon page. Top-up and auto-reload today only change a number in the browser, so both go. "Top up" becomes a notice that online payments are coming and that their account manager can add funds. Impressions are always labelled as estimates. A Member (no `billing:read`) who opens the wallet sees a plain "ask your account owner for billing access" message, not an error.

## 6. Charts

The kit, in `packages/ui/src/components/charts/`: `ChartCard` (title, empty state, chart/table toggle), `TrendChart` (area), `DonutChart`, `RankBarChart` (horizontal bars), `FunnelBars`, `WeekdayHeatmap` (CSS grid, no Recharts).

Rules follow the dataviz method: one y-axis only, thin marks with 2px lines, a legend for 2+ series, a tooltip on every chart, a table view for accessibility, color follows the entity and never its rank, at most 5 categories before folding into "Other", and status colors reserved for status. The `--chart-1…5` tokens are run through the palette validator in light and dark first and adjusted if they fail.

## 7. Non-goals

- `apps/customer-mobile`, `apps/ops-mobile` and driver apps. Their wallet and finance screens keep local placeholder data for now.
- Pesapal, top-up flows, payout execution, telemetry ingestion, invoices.
- CSV export, custom date ranges, dashboard customisation, real-time updates.
- Copying the template's unrelated dashboards (CRM, ecommerce, academy and so on).

**Anti-goal:** demo rows reaching prod, or an invented figure on any production screen.

## 8. Media page

Stays a separate project on its [existing plan](../plans/2026-10-01-media-library.md), which is fully written but unbuilt. It takes three ideas from the template's file manager (grid/list toggle, toolbar, per-file actions menu), recorded as a dated addendum on that plan. Folders stay out of the first version: the template's folders are its main feature, but the plan defers them and the used/unused filters cover the early need.
