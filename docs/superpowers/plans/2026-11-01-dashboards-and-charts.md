# Dashboards & Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give advertisers a full Overview, Finance & Billing, Reports and per-campaign report, and give ops six dashboards, all in the studio-admin analytics-v1 design, reading real tables. Seeded demo rows make dev and staging look complete while prod shows honest empty states.

**Architecture:** Six additive tables hold the data. Every delivery row records its measurement `source`, so the impressions roadmap can land without dashboard changes. Ops reads with raw SQL in `apps/ops/lib/queries/`; advertisers read through org-scoped `/v1/customer/*` routes, one per tab. A shared kit in `packages/ui` renders both. A guarded seed fills the dev database.

**Tech Stack:** Next.js App Router, Prisma 7 with hand-written SQL migrations, `pg`, TanStack Query v5, Recharts 3 via `@workspace/ui`, `radix-ui`, Zod, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-01-dashboards-and-charts-design.md](../specs/2026-11-01-dashboards-and-charts-design.md). Layouts and table columns live there and aren't repeated here. Every "per spec" below means that section's layout is the acceptance test.

**Design reference:** https://studio-admin.arhamkhnz.com/dashboard/analytics-v1. Open the matching dashboard while building each page (spec §3.3).

## Phases

Each phase can ship on its own.

| Phase | Tasks | Result |
|---|---|---|
| 1. Foundation | 1–5 | Tables, contracts, seed, kit |
| 2. Finance & Billing | 6–8 | Advertiser money pages, fake wallet gone |
| 3. Reports | 9–14 | Reports tabs, campaign report, Overview |
| 4. Ops | 15–20 | Six ops dashboards |
| 5. Finish | 21 | Checks, visual pass, docs |

Start after `feat/media-library` merges: Task 1 adds a foreign key to `media_assets`.

## Global Constraints

- **No new dependencies.** Charts use Recharts through `@workspace/ui`; tabs use the installed `radix-ui`; custom ranges use native date inputs.
- **Never commit a `Co-Authored-By` trailer or AI attribution** (CLAUDE.md).
- **Migrations are additive** and deploy before the code (`docs/shared/DEPLOYMENT.md`). Never run `db:push` on a shared database.
- **The seed never runs on prod.** No `:prod` npm script. The guard fails closed.
- **Money:** KES, formatted only with `formatKes`. SQL sums in `numeric`; convert to `Number` once, at the DTO boundary.
- **Days are Africa/Nairobi calendar days.** Use `AT TIME ZONE 'Africa/Nairobi'` when bucketing `occurred_at`.
- **Org scoping:** every advertiser query filters on `auth.access.orgId`. Cross-org access answers with no data, or 404 by id.
- **Money gating, advertiser:** spend, cost and budget fields are `null` without `billing:read`, enforced in the API, not only hidden in the UI.
- **Money gating, ops:** balances, spend, revenue and payouts load only with `finances`, in the query as well as the UI. Safety data needs `safety`.
- **Impressions are always "Est."** and show their range. Reach is never summed across campaigns.
- **Revenue and cost per 1,000 exclude `tax` rows.**
- **Design:** use the spec §3.2 values through the kit. No page-level one-off cards. No gradients, no heavy shadows.
- **Chart rules:** one y-axis, 2px lines, legend for 2+ series, tooltip on every chart, table view in `ChartCard`, at most 5 categories then "Other", colour by entity not rank, text uses text tokens.
- **Delta colour follows meaning,** not sign, with an arrow icon.
- **Empty is not broken:** with no rows, KPIs read `0` or `—` and each chart shows its message from spec §7.5.
- **Copy:** plain language, no "AI", no exclamation marks.
- After code changes, run `graphify update .`. Stage by path; a second agent may share the tree.

## Review Focus

1. **A brand-new org on prod (zero rows).** Every endpoint returns zeros and empty arrays, never `NaN`, `Infinity` or a 500. Cost per 1,000 and frequency are `null`, shown as `—`. Pinned in Tasks 2, 6 and 9.
2. **A prod org with real approved budgets and no ledger rows.** Funding is `untracked`: no "short" alert anywhere, and no campaign is flagged for funds. Pinned in Tasks 2 and 6.
3. **A Member (reports, no billing) calls the API directly.** `/reports/*` returns `null` for every money field, including inside campaign rows and CSV. The spend tab's endpoint returns 403. Pinned in Task 9.
4. **Org A requests data while org B has rows.** Only A's totals, including when a transaction's `campaign_id` belongs to B, and including invoice and statement PDFs and the campaign report by id. Pinned in Tasks 6 and 9.
5. **`DATABASE_URL` is prod through any spelling** (pooled host, `POSTGRES_URL`, unparseable string). The seed exits before opening a connection. Pinned in Task 3.
6. **Reach with several campaigns in view.** It shows `—`, never a sum. **Null impressions** stay null in totals: if every row in view is null the total is `null`, not 0. Pinned in Tasks 2 and 9.
7. **Filters that spend can't honour.** With a market or daypart filter, spend and cost per 1,000 are `null`, not the unfiltered value. Pinned in Task 9.
8. **Seed re-run, or a transaction whose org or campaign was deleted.** Totals don't double, and ops shows "Deleted organization" or "No campaign" rather than dropping the row. Pinned in Tasks 3 and 15.
9. **Statements reconcile.** Each month's closing equals the next month's opening, and the last closing equals the balance. Pinned in Task 6.
10. **Manual ledger entry.** Permission, audit event, duplicate reference and zero amount. Pinned in Task 15.
11. **A viewer with `campaigns` but not `finances`** opens Advertisers, or `drivers` but not `finances` opens Fleet. No money in the page payload. Pinned in Tasks 17 and 18.

## File Structure

```
apps/web/prisma/schema.prisma                                 + 6 models and relations
apps/web/prisma/migrations/20261101090000_dashboard_ledger/   additive SQL
packages/ops-contracts/src/analytics.ts (+ .test.ts)          DTOs, ranges, maths
packages/ops-contracts/src/health.ts (+ .test.ts)             campaignHealth, accountHealth, fundingStatus
packages/ops-contracts/src/format.ts                          + formatKes, formatCompact, toCsv
apps/api/scripts/seed-demo-data.ts (+ .test.ts)               guarded seed
apps/api/lib/analytics/finance-queries.ts                     org-scoped money queries
apps/api/lib/analytics/report-queries.ts                      org-scoped delivery queries
apps/api/lib/analytics/parse-report-query.ts                  range + filter parsing
apps/api/lib/pdf/templates/{statement,invoice,campaign-report}-pdf.tsx
apps/api/app/v1/customer/finance/**                           summary, transactions, invoices, statements
apps/api/app/v1/customer/reports/**                           overview, delivery, audience, spend, campaigns
packages/ui/src/components/tabs.tsx                           primitive
packages/ui/src/components/dashboard/*                        page blocks
packages/ui/src/components/charts/*                           chart kit
apps/customer-web/lib/analytics-client.ts, use-analytics.ts   fetch + hooks
apps/customer-web/components/billing/*                        Finance & Billing
apps/customer-web/components/reports/*                        Reports + campaign report
apps/customer-web/app/(shell)/billing/**, reports/**          routes
apps/ops/lib/queries/{finance,campaign-analytics,advertiser-analytics,fleet-analytics,support-analytics}.ts
apps/ops/components/finances/*                                rebuilt, tabs, record-transaction dialog
apps/ops/components/dashboards/*-dashboard.tsx
apps/ops/app/(dashboard)/dashboards/{campaigns,advertisers,fleet,support}/page.tsx
```

Deleted by the end: `apps/ops/lib/placeholder-data.ts`, `apps/customer-web/lib/placeholder-data.ts`, `apps/customer-web/lib/wallet.ts`, `apps/customer-web/components/wallet/wallet-view.tsx`. Mobile keeps its own files.

---

# Phase 1: Foundation

### Task 1: Tables

**Files:**
- Modify: `apps/web/prisma/schema.prisma`, `docs/shared/DATABASE.md`, `docs/shared/DATA-LAYER.md`
- Create: `apps/web/prisma/migrations/20261101090000_dashboard_ledger/migration.sql`

**Interfaces:**
- Produces: Prisma models `WalletTransaction`, `CampaignDailyStat`, `CampaignCreativeDailyStat`, `CampaignReachStat`, `Payout`, `Invoice`, with fields exactly as in spec §4.

- [ ] **Step 1: Add the models.** Status-like fields are plain `String`, like `Campaign.status`. `day`, `as_of`, `period_*`, `*_on` are `@db.Date`. Money is `Decimal(12, 2)`. Add `created_by` on `WalletTransaction`. Doc comments: the ledger is append-only and balance is derived; reach is cumulative and must never be summed; null impressions means not estimated.
- [ ] **Step 2: Add indexes.** `wallet_transactions (org_id, occurred_at)`, `(occurred_at)`, `(campaign_id)`, `(is_demo)`. `campaign_daily_stats` unique `(campaign_id, day, market, daypart, format)`, `(day)`, `(market, day)`, `(is_demo)`. `campaign_creative_daily_stats` `(campaign_id, day)`, `(is_demo)`. `campaign_reach_stats` unique `(campaign_id, as_of)`. `payouts (status, period_month)`, `(driver_id)`, `(is_demo)`. `invoices (org_id, issued_on)`, unique `(number)`, `(is_demo)`.
- [ ] **Step 3: Generate the SQL without applying it.** Run `npx prisma migrate diff` from `apps/web` against the migrations directory, save as `migration.sql`, and read it. Expected: only `CREATE TABLE`, `CREATE INDEX` and `ADD CONSTRAINT`, with no `DROP` and no touch on `cms` or `n8n` schemas.
- [ ] **Step 4: Apply to dev.** Run `npm run db:migrate:deploy -w web`, then `npm run db:migrate:status -w web`. Expected: "Database schema is up to date".
- [ ] **Step 5: Update docs.** Add the tables to `DATABASE.md`. In `DATA-LAYER.md`, state that the stats tables are delivery aggregates, that `campaign_placements` stays reserved for dispatch, and what each `source` value means.
- [ ] **Step 6: Commit** (`feat(db): add ledger, delivery stats, payouts and invoices`).

### Task 2: Contracts, maths and health rules

**Files:**
- Create: `packages/ops-contracts/src/analytics.ts`, `analytics.test.ts`, `health.ts`, `health.test.ts`
- Modify: `packages/ops-contracts/src/index.ts`, `format.ts`, `apps/ops/lib/format.ts` (re-export `toCsv` from contracts)

**Interfaces:**
- Consumes: `DateRangeKey` from `./enums`.
- Produces in `format.ts`: `formatKes(value)` (`"KES 1,200"`), `formatCompact(value)` (`"1.2M"`), `toCsv(rows, columns)` (moved).
- Produces in `analytics.ts`:
  - `type NamedValue`, `type DailyPoint`, `type Delta = { current: number; previous: number | null; change: number | null }`
  - `DAYPARTS`, `DAYPART_LABELS`, `SPEND_CATEGORIES`, `SPEND_CATEGORY_LABELS`, `MEASUREMENT_SOURCES`
  - `foldOther(rows, max?)`, `fillDays(rows, start, end, keys)`, `rate(part, whole)`
  - `resolveReportRange(input: { range?: string; from?: string; to?: string }, today: Date): { start: string; end: string; previous: { start: string; end: string } | null }` (throws `RangeError` on bad dates, reversed dates, or over 366 days)
  - `delta(current, previous): Delta`
  - `costPerThousand(spendKes, impressions)`, `frequency(impressions, reach)`
  - `sumNullable(values: (number | null)[]): number | null`
  - `measurementLevel(sources: string[]): "booked" | "logged" | "modelled" | "calibrated"` (lowest in view)
  - `runwayDays(availableKes, avgDailySpendKes): number | null`
  - `committedKes(campaigns: { budgetKes: number; spentKes: number }[]): number`
  - `netMargin(input)`
  - `monthlyStatements(rows: { month: string; kind: string; amountKes: number }[]): StatementRow[]`
  - DTOs per spec §7: `FinanceSummaryDto`, `TransactionPageDto`, `InvoiceDto`, `StatementRowDto`, `ReportOverviewDto`, `ReportDeliveryDto`, `ReportAudienceDto`, `ReportSpendDto`, `ReportCampaignRowDto`, `CampaignReportDto`. Money fields are `number | null`.
- Produces in `health.ts`: `campaignHealth(input)`, `accountHealth(input)`, `fundingStatus(input)` per spec §9.3, thresholds as named constants.

- [ ] **Step 1: Write the failing tests.**

```ts
expect(foldOther([{name:"a",value:9},{name:"b",value:8},{name:"c",value:7},{name:"d",value:6},{name:"e",value:5},{name:"f",value:4}]))
  .toEqual([{name:"a",value:9},{name:"b",value:8},{name:"c",value:7},{name:"d",value:6},{name:"Other",value:9}])
expect(foldOther([])).toEqual([])
expect(fillDays([{day:"2026-01-02",n:3}],"2026-01-01","2026-01-03",["n"]))
  .toEqual([{day:"2026-01-01",n:0},{day:"2026-01-02",n:3},{day:"2026-01-03",n:0}])
expect(costPerThousand(5000, 1000000)).toBe(5)
expect(costPerThousand(5000, 0)).toBeNull()
expect(frequency(900, 300)).toBe(3)
expect(frequency(900, 0)).toBeNull()
expect(rate(1, 0)).toBeNull()
expect(sumNullable([null, null])).toBeNull()
expect(sumNullable([null, 4, 6])).toBe(10)
expect(delta(110, 100)).toEqual({ current: 110, previous: 100, change: 10 })
expect(delta(5, 0).change).toBeNull()
expect(delta(5, null).change).toBeNull()
expect(measurementLevel(["calibrated", "logged"])).toBe("logged")
expect(measurementLevel([])).toBe("booked")
expect(runwayDays(100000, 0)).toBeNull()
expect(committedKes([{budgetKes:100,spentKes:150},{budgetKes:100,spentKes:40}])).toBe(60)
expect(netMargin({revenueKes:100000,payoutsKes:40000,toolsMonthlyKes:30000,rangeDays:30})).toBe(30000)
expect(formatKes(1200)).toBe("KES 1,200")
expect(formatCompact(1200000)).toBe("1.2M")

const r = resolveReportRange({ from: "2026-10-01", to: "2026-10-10" }, new Date("2026-11-01"))
expect(r.previous).toEqual({ start: "2026-09-21", end: "2026-09-30" })
expect(resolveReportRange({ range: "all" }, new Date("2026-11-01")).previous).toBeNull()
expect(() => resolveReportRange({ from: "2026-10-10", to: "2026-10-01" }, new Date())).toThrow(RangeError)
expect(() => resolveReportRange({ from: "2025-01-01", to: "2026-10-01" }, new Date())).toThrow(RangeError)

const rows = monthlyStatements([
  { month: "2026-09", kind: "top_up", amountKes: 1000 },
  { month: "2026-09", kind: "spend", amountKes: -400 },
  { month: "2026-10", kind: "spend", amountKes: -100 },
])
expect(rows[0]).toMatchObject({ opening: 0, closing: 600 })
expect(rows[1]).toMatchObject({ opening: 600, closing: 500 })

expect(fundingStatus({ hasLedgerRows: false, availableKes: -5000, runwayDays: null }).level).toBe("untracked")
expect(fundingStatus({ hasLedgerRows: true, availableKes: -1, runwayDays: null }).level).toBe("short")
expect(fundingStatus({ hasLedgerRows: true, availableKes: 100, runwayDays: 5 }).level).toBe("low")
expect(campaignHealth(base({ status: "changes_requested" })).level).toBe("action_needed")
expect(campaignHealth(base({ deliveryRate: null, daysIntoFlight: 10 })).level).toBe("on_track")
expect(campaignHealth(base({ deliveryRate: 0.7, daysIntoFlight: 2 })).level).toBe("on_track")
expect(campaignHealth(base({ deliveryRate: 0.7, daysIntoFlight: 3 })).level).toBe("at_risk")
expect(campaignHealth(base({ deliveryRate: 0.9, daysIntoFlight: 5 })).level).toBe("watch")
```

- [ ] **Step 2: Run to confirm failure.** `npm test -w @workspace/ops-contracts`. Expected: FAIL, functions not exported.
- [ ] **Step 3: Implement.** Scale tools cost as `toolsMonthlyKes * rangeDays / 30`. `fillDays` iterates date strings in UTC so a loop can't skip a day. `delta` returns `null` change when previous is 0 or null.
- [ ] **Step 4: Run to confirm pass.** Same command. Expected: PASS. Run ops typecheck too, since `toCsv` moved.
- [ ] **Step 5: Commit** (`feat(contracts): add analytics DTOs, maths and health rules`).

### Task 3: Guarded demo seed

**Files:**
- Create: `apps/api/scripts/seed-demo-data.ts`, `apps/api/scripts/seed-demo-data.test.ts`
- Modify: `apps/api/package.json`, `docs/shared/DEV-SETUP.md`

**Interfaces:**
- Consumes: Task 1 models; `SPEND_CATEGORIES`, `DAYPARTS`.
- Produces: `assertDevDatabase(url)`, `planOrgDemo(orgId, ownerClerkId, today, seed)` (pure), `resetDemoData()`, `seedDemoData({ orgId? })`, npm script `seed:demo`: `dotenv -e .env.local -- tsx scripts/seed-demo-data.ts`.

Demo markers, used by reset:

| Rows | Marker |
|---|---|
| new tables | `is_demo = true` |
| `campaigns` | `notes = '[demo-seed]'` |
| `drivers`, `support_cases` | email ending `@demo.admobihq.invalid` |
| `driver_profiles`, `safety_incidents` | clerk id starting `demo_` |

- [ ] **Step 1: Confirm the dev host.** Check the `DATABASE_URL` host in `apps/api/.env.local`. DEPLOYMENT.md gives the dev branch as `ep-sparkling-waterfall…` and prod as `ep-winter-rain…`, both marked "e.g.". Do not assume; set `DEV_DB_HOST_PREFIXES` from what you find and stop to ask if it doesn't match the docs.
- [ ] **Step 2: Write the failing tests.**

```ts
it("allows the dev branch, pooled or direct, and localhost", () => {
  expect(() => assertDevDatabase("postgresql://u:p@ep-sparkling-waterfall-abc.eu.aws.neon.tech/db")).not.toThrow()
  expect(() => assertDevDatabase("postgresql://u:p@ep-sparkling-waterfall-abc-pooler.eu.aws.neon.tech/db")).not.toThrow()
  expect(() => assertDevDatabase("postgresql://u:p@localhost:5432/db")).not.toThrow()
})
it("refuses prod, unknown hosts, junk and undefined", () => {
  for (const url of ["postgresql://u:p@ep-winter-rain-abc-pooler.eu.aws.neon.tech/db", "postgresql://u:p@other.neon.tech/db", "not a url", "", undefined]) {
    expect(() => assertDevDatabase(url)).toThrow(/refusing/i)
  }
})
it("refuses whichever of DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL resolves", () => { /* uses resolveDatabaseUrl() order */ })
it("wallet history reconciles and every spend row has a category", () => {
  const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
  expect(plan.transactions.reduce((t, x) => t + x.amount_kes, 0)).toBeGreaterThan(0)
  expect(plan.transactions.filter(t => t.kind === "spend").every(t => t.amount_kes < 0 && t.spend_category)).toBe(true)
})
it("stats keys are unique, and delivered + missed = scheduled", () => {
  const { stats } = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
  expect(new Set(stats.map(s => [s.campaign_id, s.day, s.market, s.daypart, s.format].join())).size).toBe(stats.length)
  expect(stats.every(s => s.plays_delivered - s.plays_over + s.plays_missed === s.plays_scheduled)).toBe(true)
  expect(stats.every(s => s.impressions_low! <= s.impressions_likely! && s.impressions_likely! <= s.impressions_high!)).toBe(true)
})
it("covers every health state and at least two measurement sources", () => {
  const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
  expect(new Set(plan.campaigns.map(c => c.demoState))).toEqual(new Set(["healthy","under_delivering","changes_requested","ending_soon","completed","no_creative"]))
  expect(new Set(plan.stats.map(s => s.source)).size).toBeGreaterThan(1)
})
it("is deterministic", () => {
  const today = new Date("2026-11-01")
  expect(planOrgDemo(1, "u", today, 42)).toEqual(planOrgDemo(1, "u", today, 42))
})
it("re-running leaves the same row count and removes nothing real", async () => { /* testDatabaseUrl(); insert a real wallet row and campaign; seed twice; counts equal; real rows survive */ })
```

- [ ] **Step 3: Run to confirm failure.** `npm test -w api -- seed-demo-data`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement.** `assertDevDatabase(resolveDatabaseUrl())` runs **before** `new PrismaClient`. Use a small seeded PRNG (mulberry32), no `Math.random`. For each org with an active owner: campaigns per the states above, plus realistic market, daypart and weekday shapes (evening peak, weekday commute, CBD heavy) so heatmaps look real. Daily burn spend split about 70/10/8/12 across `screen_time`, `production`, `service_fee`, `tax` (placeholder ratios). Top-ups keep the balance positive, except one org left short so the alert can be seen. Monthly invoices with line snapshots. Reach rows with `reach_likely` around impressions ÷ 3–6. Creative rows only for campaigns that have creative. Then global rows: 40 CRM drivers, 40 driver profiles across statuses, monthly payouts, 60 support cases, 12 safety incidents. Reset and insert run in one `$transaction`. Print a count per table and the host it wrote to. Stop if the total passes 50,000 rows.
- [ ] **Step 5: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 6: Seed dev.** Run `npm run seed:demo -w api`. Expected: counts printed; a second run prints the same counts.
- [ ] **Step 7: Document** in `DEV-SETUP.md`: the command, that one run covers local and staging, how to re-run after schema changes.
- [ ] **Step 8: Commit** (`feat(api): add dev-only demo data seed`).

### Task 4: Page blocks

**Files:**
- Create: `packages/ui/src/components/tabs.tsx`, and in `packages/ui/src/components/dashboard/`: `kpi-strip.tsx`, `hero-metric.tsx`, `metric-tile.tsx`, `delta-pill.tsx`, `status-pill.tsx`, `notes.tsx` (`LeverTile`, `OwnerStrip`, `InsightNote`, `AlertStrip`), `action-queue.tsx`, `progress-card.tsx`, `ledger-card.tsx`, `dashboard-toolbar.tsx`, `dashboard-tabs.tsx`, `dashboard-card.tsx`

**Interfaces:**
- Produces:
  - `KpiStrip({ items: { label, value, note?, delta?, icon? }[]; columns? })`
  - `HeroMetric({ label, value, deltas, note, series? })`
  - `MetricTile({ label, value, note })`
  - `DeltaPill({ delta: Delta; good: "up"|"down"|"neutral"; format? })`
  - `StatusPill({ tone: "good"|"warning"|"serious"|"neutral"; children })`
  - `AlertStrip({ title, body, action })`
  - `ActionQueue({ items: { title, meta, action, tag, href }[]; empty })`
  - `ProgressCard({ title, status, subtitle, percent, footer, href })`
  - `LedgerCard({ title, description, summary, filterTabs, toolbar, columns, rows, footer })`
  - `DashboardToolbar({ view?, filters?, showing?, range, onRangeChange, onExport?, badge? })`, where the range control offers presets plus Custom with two native date inputs in a `Popover`
  - `DashboardTabs({ tabs, value, onChange })`, the muted pill bar

- [ ] **Step 1: Add `tabs.tsx`** in the same style as other `radix-ui` wrappers in the package.
- [ ] **Step 2: Build the blocks** to the exact classes in spec §3.2. Compare side by side with the template's `analytics-v1` page in both themes. Everything stacks at phone width with no horizontal scroll; tables scroll inside their card.
- [ ] **Step 3: Check types and lint** scoped to `@workspace/ui`. Expected: clean.
- [ ] **Step 4: Commit** (`feat(ui): add dashboard page blocks`).

### Task 5: Chart kit

**Files:**
- Create in `packages/ui/src/components/charts/`: `chart-card.tsx`, `trend-chart.tsx`, `mirror-bars.tsx`, `pacing-bars.tsx`, `donut-chart.tsx`, `share-bar.tsx`, `rank-bars.tsx`, `funnel-bars.tsx`, `heatmap.tsx`, `segment-gauge.tsx`, `tick-bar.tsx`, `sparkline.tsx`, `hatch.tsx`
- Modify: `packages/ui/src/styles/globals.css` (only if the palette fails)

**Interfaces:**
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend` from `chart.tsx`.
- Produces:
  - `ChartCard({ title, description?, action?, isEmpty, emptyMessage, table?: { columns; rows }, children })`
  - `TrendChart({ data; series: { key; label; color?; dashed?; band?: [lowKey, highKey] }[]; stacked?; valueFormatter? })`
  - `MirrorBars({ data; up: { key; label }; down: { key; label }; valueFormatter? })`
  - `PacingBars({ data: { period; percent }[]; target?: number })`
  - `DonutChart({ data; centerLabel?; valueFormatter? })`, `ShareBar({ data; valueFormatter? })`
  - `RankBars({ data: (NamedValue & { change?: number | null })[]; valueFormatter? })`
  - `FunnelBars({ steps })`
  - `Heatmap({ rows: string[]; columns: string[]; cells: { row; column; value }[]; valueFormatter? })` (single hue, CSS grid, a text value in each cell)
  - `SegmentGauge({ value; max; label })`, `TickBar({ percent; tone })`, `Sparkline({ data; dataKey })`

- [ ] **Step 1: Validate the palette.** Convert `--chart-1…5` to hex for light and dark, then run the dataviz validator: `node <dataviz skill dir>/scripts/validate_palette.js "<hexes>" --mode light`, and again with `--mode dark`. Expected: no FAIL. On FAIL, adjust only the failing token. `integration-costs.ts` hardcodes its own colours; leave them.
- [ ] **Step 2: Build the kit.** `ChartCard` owns the chart/table toggle and empty state. Colours come from `--chart-N` assigned by entity, so `DonutChart` and `ShareBar` take stable input order and never sort at render. Use a 2px surface gap between segments. `hatch.tsx` defines the SVG `<pattern>`, used by `RankBars` tracks and monthly bars. Bars, grid and target line use the values in spec §3.2. `MirrorBars` is one y-axis around zero. `PacingBars` plots percent of schedule only.
- [ ] **Step 3: Check types and lint** scoped to `@workspace/ui`. Expected: clean.
- [ ] **Step 4: Commit** (`feat(ui): add shared dashboard chart kit`).

---

# Phase 2: Finance & Billing

### Task 6: Finance API

**Files:**
- Create: `apps/api/lib/analytics/finance-queries.ts`, `apps/api/lib/analytics/parse-report-query.ts`, `apps/api/lib/pdf/templates/statement-pdf.tsx`, `invoice-pdf.tsx`, and in `apps/api/app/v1/customer/finance/`: `summary/route.ts`, `transactions/route.ts`, `invoices/route.ts`, `invoices/[id]/pdf/route.tsx`, `statements/route.ts`, `statements/[month]/pdf/route.tsx`, `finance.test.ts`
- Modify: `docs/api/API.md`

**Interfaces:**
- Consumes: `requireCustomerPermissionAccess`; Task 2 DTOs; `isActive` from `campaign-statement.ts`; `renderPdf`.
- Produces, all requiring `billing:read`:
  - `GET /v1/customer/finance/summary?range|from,to`
  - `GET /v1/customer/finance/transactions?kind&q&page&sort&format=csv`
  - `GET /v1/customer/finance/invoices`, `GET .../invoices/[id]/pdf`
  - `GET /v1/customer/finance/statements`, `GET .../statements/[month]/pdf`

- [ ] **Step 1: Write the failing tests**, in the `org.test.ts` style (real test DB, mocked `api-utils`):

```ts
it("zero-row org returns zeros, not NaN, and funding untracked", ...)
it("real budgets with no ledger rows stay untracked, with no short alert", ...)
it("balance is all-time when the range is 7d; spent respects the range", ...)
it("deltas compare to the previous period; 'all' has none", ...)
it("org A never sees org B's money, invoices or statements", ...)
it("an invoice id from another org returns 404", ...)
it("a transaction on org A carrying org B's campaign is counted for A without exposing B's campaign name", ...)
it("committed uses isActive and floors at 0 per campaign", ...)
it("balance after is correct across pages", ...)
it("statements chain: closing = next opening; last closing = balance", ...)
it("csv export returns every filtered row, not one page", ...)
it("returns 403 without billing:read", ...)
it("rejects an unknown range, reversed dates and over 366 days with 400", ...)
```

- [ ] **Step 2: Run to confirm failure.** `npm test -w api -- finance`. Expected: FAIL.
- [ ] **Step 3: Implement.** `parseReportQuery` wraps `resolveReportRange` and answers 400 on `RangeError`. Use `prisma.$queryRaw` with parameters. Balance after uses `SUM(amount_kes) OVER (ORDER BY occurred_at, id)` before paging. `spentKes` is the absolute sum of `spend` rows net of `refund`. Upcoming charges reads scheduled campaigns' budget minus spend. Read-only, so no audit event. Invoice and statement PDFs carry the "not a tax invoice" footnote, and stay inside Latin-1 per the note in `campaign-statement.ts`.
- [ ] **Step 4: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 5: Document** the routes in `API.md`; run `node scripts/generate-bruno.mjs` if that keeps the collection current.
- [ ] **Step 6: Commit** (`feat(api): add advertiser finance endpoints`).

### Task 7: Finance & Billing page, Overview tab

**Files:**
- Create: `apps/customer-web/lib/analytics-client.ts`, `apps/customer-web/lib/use-analytics.ts`, `apps/customer-web/lib/use-dashboard-params.ts`, `apps/customer-web/app/(shell)/billing/page.tsx`, `loading.tsx`, `apps/customer-web/components/billing/billing-view.tsx`, `billing-overview-tab.tsx`, `funding-card.tsx`
- Modify: `apps/customer-web/lib/navigation.ts`, `apps/customer-web/app/(shell)/settings/billing/page.tsx` (redirect to `/billing`), `docs/customer/APP.md`
- Delete: `apps/customer-web/app/(shell)/settings/billing/loading.tsx`, `apps/customer-web/components/wallet/wallet-view.tsx`, `apps/customer-web/lib/wallet.ts`, `apps/customer-web/lib/placeholder-data.ts` (first grep for other importers)

**Interfaces:**
- Consumes: Tasks 4, 5 and 6; `orgCan`, `useOrg`.
- Produces: `useDashboardParams()` (URL state for tab, range, filters), `useFinanceSummary(params, { enabled })` with `staleTime` 5 minutes, and the tab shell.

- [ ] **Step 1: Update navigation.** Label **Finance & Billing**, href `/billing`, description "Your funds, spending, invoices and statements." Grep customer-web for links to `/settings/billing`, and update them. `/settings/billing` redirects so old links work. Keep `/settings/billing` in mobile untouched.
- [ ] **Step 2: Build the Overview tab** per spec §7.2. Tabs live in the URL (`?tab=`), wrapped in `Suspense` for `useSearchParams`. Top up opens the notice dialog. Remove the top-up and auto-reload panels and the balance toggle.
- [ ] **Step 3: Handle access and untracked states.** Without `billing:read`, render "Ask your account owner for billing access." and disable the query, so no 403 toast fires. With `untracked` funding, use the spec's message.
- [ ] **Step 4: Verify in the browser.** Run `npm run dev`, sign in on `:3002` with a seeded org and a Member. Expected: numbers reconcile; the short-of-funds org shows the alert; a new org shows empty states; a Member sees the access message; both themes render; no horizontal scroll at phone width.
- [ ] **Step 5: Update `docs/customer/APP.md`**, which should no longer describe a local wallet.
- [ ] **Step 6: Commit** (`feat(customer-web): add Finance & Billing overview`).

### Task 8: Transactions, Invoices, Statements tabs

**Files:**
- Create in `apps/customer-web/components/billing/`: `transactions-tab.tsx`, `transaction-sheet.tsx`, `invoices-tab.tsx`, `invoice-sheet.tsx`, `statements-tab.tsx`

**Interfaces:**
- Consumes: Task 6 routes, `LedgerCard`.

- [ ] **Step 1: Build the three tabs** per spec §7.2, with server paging for transactions. CSV and PDF download through the existing authenticated download pattern used by the statement button.
- [ ] **Step 2: Keep the budget statement** download on the Statements tab, moved from the old wallet page.
- [ ] **Step 3: Handle missing billing details.** With no `billingEmail` or `taxPin`, show an `AlertStrip` to organization settings on the Invoices tab.
- [ ] **Step 4: Verify in the browser.** Expected: filters and paging work; CSV opens and matches the filtered totals; PDFs download with correct totals; statements chain; a new org shows each empty message.
- [ ] **Step 5: Commit** (`feat(customer-web): add transactions, invoices and statements`).

---

# Phase 3: Reports

### Task 9: Reports API

**Files:**
- Create: `apps/api/lib/analytics/report-queries.ts`, and in `apps/api/app/v1/customer/reports/`: `overview/route.ts`, `delivery/route.ts`, `audience/route.ts`, `spend/route.ts`, `campaigns/route.ts`, `campaigns/[id]/route.ts`, `reports.test.ts`
- Modify: `docs/api/API.md`

**Interfaces:**
- Consumes: `parseReportQuery`, `getOwnedCampaign`, Task 2 maths and health.
- Produces: `GET /v1/customer/reports/{overview,delivery,audience,campaigns}` with `reports:read`, filters `campaign`, `market`, `format`, `daypart`, and `format=csv` on table views. `GET /reports/spend` requires `reports:read` and `billing:read`. `GET /reports/campaigns/[id]`.

- [ ] **Step 1: Write the failing tests:**

```ts
it("zero-row org returns zeros, nulls and measurementLevel booked", ...)
it("booked content still returns with no stats rows", ...)
it("without billing:read every money field is null, including campaign rows and csv", ...)
it("spend tab returns 403 without billing:read", ...)
it("org A never sees org B's delivery; another org's campaign id returns 404", ...)
it("a market filter sets spend and cost per 1,000 to null", ...)
it("all-null impressions total null, not 0", ...)
it("reach appears for one campaign and is null for several", ...)
it("reach is the latest row, not a sum", ...)
it("measurementLevel is the lowest source in view", ...)
it("cost per 1,000 excludes tax rows", ...)
it("active vehicles takes the daypart max per day, not the sum", ...)
it("delivery rate ignores over-delivered plays", ...)
it("filters combine, and unknown filter values return 400", ...)
```

- [ ] **Step 2: Run to confirm failure.** `npm test -w api -- reports`. Expected: FAIL.
- [ ] **Step 3: Implement.** One shared `statsWhere(orgId, filters)` builder so every tab scopes alike. Totals cover campaigns where `campaigns.org_id = orgId`. Spend comes from `wallet_transactions`, never the stats tables. Delivery rate is `(delivered − over) ÷ scheduled`. Build each row through one money-gating mapper, so a new field can't skip the check. Campaign rows call `campaignHealth`.
- [ ] **Step 4: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 5: Document** in `API.md`, including what each `source` means.
- [ ] **Step 6: Commit** (`feat(api): add advertiser report endpoints`).

### Task 10: Reports shell and Overview tab

**Files:**
- Create in `apps/customer-web/components/reports/`: `reports-view.tsx`, `report-filters.tsx`, `measurement-badge.tsx`, `how-we-estimate-sheet.tsx`, `overview-tab.tsx`, `delivery-pacing-card.tsx`, `whats-working-card.tsx`, `campaign-health-ledger.tsx`
- Modify: `apps/customer-web/app/(shell)/reports/page.tsx`, `reports/loading.tsx`, `apps/customer-web/lib/navigation.ts` (Reports description), `docs/customer/APP.md`

- [ ] **Step 1: Build the shell:** tabs, `DashboardToolbar`, filter popover with `Showing:`, measurement badge. Replace `ComingSoon`. Without `reports:read`, show the access message.
- [ ] **Step 2: Build the Overview tab** per the spec §7.3 layout. `How we estimate` is plain text: what each level means, the low / likely / high range, sources.
- [ ] **Step 3: Verify in the browser.** Expected: seeded org matches the layout; changing filters refetches and updates the URL; a Member sees no money; a prod-like org shows Booked content and the delivery empty message.
- [ ] **Step 4: Commit** (`feat(customer-web): add reports shell and overview`).

### Task 11: Delivery and Audience tabs

**Files:**
- Create in `apps/customer-web/components/reports/`: `delivery-tab.tsx`, `audience-tab.tsx`, `market-map-card.tsx`

**Interfaces:**
- Consumes: `MARKET_CELLS` from `@workspace/geo/markets`, `MapGeoJSON` from `@workspace/ui/components/map`.

- [ ] **Step 1: Build both tabs** per spec §7.3. The Market × daypart heatmap leads the Audience tab.
- [ ] **Step 2: Build the market map.** Turn each market's H3 cells into GeoJSON, shade on one hue by impressions, memoise `data` so filters re-shade without remounting. Load the map lazily, only on this tab.
- [ ] **Step 3: Write the reach reading** as a small pure function, tested: high impressions with low reach reads "a small group saw this often"; the reverse reads "broad, light coverage".
- [ ] **Step 4: Verify in the browser.** Expected: heatmap totals equal the market totals; map shading matches the rank bars; reach shows `—` until one campaign is filtered.
- [ ] **Step 5: Commit** (`feat(customer-web): add delivery and audience reports`).

### Task 12: Spend and Campaigns tabs

**Files:**
- Create in `apps/customer-web/components/reports/`: `spend-tab.tsx`, `campaigns-tab.tsx`, `campaign-quick-view.tsx`

- [ ] **Step 1: Build both tabs** per spec §7.3. Spend shows the access message without `billing:read`, and its query stays disabled. Money columns collapse for a Member.
- [ ] **Step 2: Verify in the browser.** Expected: spend totals match Finance & Billing for the same range; CSV matches the table; a row opens the report and the quick view.
- [ ] **Step 3: Commit** (`feat(customer-web): add spend and campaign reports`).

### Task 13: Campaign report and PDFs

**Files:**
- Create: `apps/customer-web/app/(shell)/reports/campaigns/[id]/page.tsx`, `apps/customer-web/components/reports/campaign-report-view.tsx`, `apps/api/lib/pdf/templates/campaign-report-pdf.tsx`, `apps/api/app/v1/customer/reports/campaigns/[id]/pdf/route.tsx`
- Modify: `apps/api/lib/campaigns/campaign-statement.ts` (+ tests), `apps/api/app/v1/customer/campaigns/[id]/proof-of-play/route.tsx`, `apps/customer-web/components/campaigns/campaign-detail-view.tsx`

- [ ] **Step 1: Write failing tests** for `buildProofOfPlay`: with no stats, output is unchanged and keeps its footnote; with `logged` rows it adds plays by market; with `modelled` rows it adds low / likely / high; demo-free output never claims more than the rows support.
- [ ] **Step 2: Run to confirm failure.** `npm test -w api -- campaign-statement`. Expected: FAIL.
- [ ] **Step 3: Implement** the optional stats input, then the report page per spec §7.4, reusing Task 10 and 11 cards with a campaign filter. The PDF omits money without `billing:read`. Add "View report" to campaign detail.
- [ ] **Step 4: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 5: Verify in the browser.** Expected: another org's id shows not found; both PDFs download; PDF numbers equal the page.
- [ ] **Step 6: Commit** (`feat: add campaign report page and PDFs`).

### Task 14: Advertiser Overview

**Files:**
- Modify: `apps/customer-web/components/overview/overview-view.tsx`
- Create: `apps/customer-web/components/overview/needs-attention-card.tsx`, `active-campaigns.tsx`

**Interfaces:**
- Consumes: `/reports/overview`, `/finance/summary` (only with `billing:read`), `campaignHealth`, `fundingStatus`.

- [ ] **Step 1: Rebuild** per spec §7.1, each block gated on its permission. Update the doc comment that says impressions and spend are absent. Keep `summarize()` and the existing rule against invented numbers.
- [ ] **Step 2: Verify in the browser.** Expected: seeded org shows charts and attention items; Member sees no money; new org shows "Nothing needs your attention."; a real-budget org with no ledger shows no funding alert.
- [ ] **Step 3: Commit** (`feat(customer-web): rebuild overview`).

---

# Phase 4: Ops

### Task 15: Ops Finance and Record transaction

**Files:**
- Create: `apps/ops/lib/queries/finance.ts` (+ test), `apps/ops/components/finances/{overview,ledger,wallets,payouts,tool-costs}-tab.tsx`, `record-transaction-dialog.tsx`, the matching server action or API route, following how ops writes elsewhere
- Modify: `apps/ops/components/finances/finance-view.tsx`, `apps/ops/app/(dashboard)/finances/page.tsx`, `docs/ops/OPS-ADMIN.md`
- Delete: `apps/ops/lib/placeholder-data.ts`

**Interfaces:**
- Consumes: `getDateRangeStart`, `getPgPool`, `monthlyUsd` and `USD_KES` from `integration-costs.ts` (only `active` and `trial` rows, converted to KES), `netMargin`, `foldOther`, `fundingStatus`, kit. That file has its own `formatKes`; leave it alone and import the contracts one here.
- Produces: `getFinanceDashboard(range)` cached with `unstable_cache`, `revalidate: 300`; `recordTransaction(input)`.

- [ ] **Step 1: Write failing tests** for `recordTransaction`: requires `finances`; writes `provider = manual`, `created_by` and an audit event; applies the correct sign per kind; rejects zero and a duplicate reference.
- [ ] **Step 2: Run to confirm failure,** then implement. Ledger rows are insert-only.
- [ ] **Step 3: Write the query** following `queryOverviewStats`. `pg` returns money as strings, so convert once. Transactions `LEFT JOIN` orgs and campaigns so rows with a null org or campaign stay, shown as "Deleted organization" / "No campaign". Funds held is all-time. Revenue excludes `tax` rows.
- [ ] **Step 4: Build the tabs** per spec §8.2. Reuse `OverviewRangePicker`'s URL pattern through `DashboardToolbar`. Keep coming-soon dialogs other than top-up. Wrap the query in the same try/catch and `ApiErrorBanner` as `overview-stats.tsx`.
- [ ] **Step 5: Verify in the browser** on `:3001`. Expected: Revenue matches the ledger; payouts by status sum to the KPI; recording a top-up shows on the advertiser's page after the cache window; an unpermitted user is redirected to `/home`.
- [ ] **Step 6: Update `OPS-ADMIN.md`**, removing "sample data" from the Finances line and documenting Record transaction.
- [ ] **Step 7: Commit** (`feat(ops): rebuild finance dashboard and add manual ledger entry`).

### Task 16: Sidebar and Campaigns dashboard

**Files:**
- Create: `apps/ops/lib/queries/campaign-analytics.ts`, `apps/ops/app/(dashboard)/dashboards/campaigns/page.tsx`, `apps/ops/components/dashboards/campaigns-dashboard.tsx`
- Modify: `apps/ops/components/shell/ops-shell.tsx`, `apps/ops/lib/tour-chapters.ts` if it references moved items

**Interfaces:**
- Produces: `dashboardNavItems` in `ops-shell.tsx`, included in `allNavItems`, filtered with the existing `canSee`. `getCampaignDashboard(range)`.

- [ ] **Step 1: Add the sidebar group.** Move Overview and Finances into a **Dashboards** `SidebarGroup` above Operations, and add Campaigns, Advertisers, Fleet and Support & safety. Distinct hrefs from `/campaigns`; `isNavItemActive` matches by prefix, so `/dashboards/campaigns` stays separate. Do Tasks 16 to 19 on one branch so no link ships dead.
- [ ] **Step 2: Build the query and page** per spec §8.3, guarded by `requireOpsPermission("campaigns")`. Booked budget needs `finances`; without it, the hero shows Live campaigns. Approval rate uses `rate(approved, approved + rejected)`, leaving out `changes_requested`. "Live" uses `campaignFlightPhase` semantics in SQL. Avg review time is `reviewed_at − submitted_at`.
- [ ] **Step 3: Verify in the browser.** Expected: pipeline counts match `/campaigns`; Live matches a manual count; the review queue is oldest first.
- [ ] **Step 4: Commit** (`feat(ops): add dashboards nav and campaigns dashboard`).

### Task 17: Advertisers dashboard

**Files:**
- Create: `apps/ops/lib/queries/advertiser-analytics.ts` (+ test), `apps/ops/app/(dashboard)/dashboards/advertisers/page.tsx`, `apps/ops/components/dashboards/advertisers-dashboard.tsx`

**Interfaces:**
- Produces: `getAdvertiserDashboard(range, { includeMoney })`.

- [ ] **Step 1: Write a failing test** that `includeMoney: false` returns no money keys at all.
- [ ] **Step 2: Build the query and page** per spec §8.4, with the same guard as `/advertiser-orgs`. Owner comes from the org's `is_owner` member. Reasons come from `accountHealth`. Cache the two variants under separate keys, so a cached money payload can't reach a viewer without `finances`.
- [ ] **Step 3: Verify in the browser** with and without `finances`. Expected: no money in the HTML payload without it; rows link to the org page.
- [ ] **Step 4: Commit** (`feat(ops): add advertisers dashboard`).

### Task 18: Fleet dashboard

**Files:**
- Create: `apps/ops/lib/queries/fleet-analytics.ts`, `apps/ops/app/(dashboard)/dashboards/fleet/page.tsx`, `apps/ops/components/dashboards/fleet-dashboard.tsx`

**Interfaces:**
- Produces: `getFleetDashboard(range, { includeMoney })`.

- [ ] **Step 1: Build the query and page** per spec §8.5, guarded by `requireOpsPermission("drivers")`. CRM `drivers` exclude `deleted_at IS NOT NULL`. The application funnel reads `driver_profiles.status`, since CRM `drivers.status` is a different lifecycle. Active drivers means CRM `status = 'active'`. Avg active vehicles takes the max across dayparts per campaign per day, sums across campaigns, then averages. Mark that with a `ponytail:` comment: it overcounts a vehicle running two campaigns until telemetry gives vehicle-level data. Cache variants as in Task 17.
- [ ] **Step 2: Verify in the browser.** Expected: drivers by city matches `/drivers` filters; zero payouts shows the empty message; no payouts without `finances`.
- [ ] **Step 3: Commit** (`feat(ops): add fleet dashboard`).

### Task 19: Support & safety dashboard

**Files:**
- Create: `apps/ops/lib/queries/support-analytics.ts`, `apps/ops/app/(dashboard)/dashboards/support/page.tsx`, `apps/ops/components/dashboards/support-dashboard.tsx`

**Interfaces:**
- Produces: `getSupportDashboard(range, { includeSafety })`, with `safety: {...} | null`.

- [ ] **Step 1: Build the query and page** per spec §8.6, guarded by `requireOpsPermission("support")`. Only fetch and show incident data when the viewer also holds `safety` (admins pass). Open means support `status IN ('open','pending')`; incident `status IN ('new','acknowledged','in_progress')`. Severity charts use status colours with a label.
- [ ] **Step 2: Verify in the browser.** Expected: a support-only role sees no incident data; totals match `/support` and `/sos`.
- [ ] **Step 3: Commit** (`feat(ops): add support and safety dashboard`).

### Task 20: Ops Overview

**Files:**
- Modify: `apps/ops/components/overview/overview-dashboard.tsx`, `apps/ops/app/(dashboard)/settings/(prefs)/integrations/integrations-view.tsx` only if it is a straight swap

- [ ] **Step 1: Move Overview onto the kit** per spec §8.1, keeping its data.
- [ ] **Step 2: Add the Action queue,** with counts only for dashboards the viewer can open.
- [ ] **Step 3: Verify in the browser.** Expected: each count equals its dashboard; a limited role sees fewer rows.
- [ ] **Step 4: Commit** (`feat(ops): rebuild overview with action queue`).

---

# Phase 5: Finish

### Task 21: Final checks and rollout notes

**Files:**
- Modify: `docs/shared/FEATURE-INVENTORY.md`, `docs/shared/ROADMAP.md`, `docs/superpowers/plans/2026-09-24-audience-index-phase-1.md` (dated addendum only)

- [ ] **Step 1: Run everything.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Expected: all pass. Report any failure with its output.
- [ ] **Step 2: Grep for leftovers.** `placeholder-data`, `PLACEHOLDER_WALLET_BALANCE`, `SPEND_BY_CAMPAIGN` in `apps/ops` and `apps/customer-web`. Expected: none.
- [ ] **Step 3: Visual pass.** Screenshot every dashboard and tab, light and dark, desktop and phone width, seeded and empty. Place each next to its reference from spec §3.3. Check label collisions and the dataviz anti-patterns list.
- [ ] **Step 4: Update docs.** `FEATURE-INVENTORY.md` for the new pages. `ROADMAP.md`: `Payout` exists; telemetry and Pesapal write to the new tables. Add a dated addendum to the audience plan saying which tables and `source` values steps 2, 3 and 6 write to, and that step 3 must add reach.
- [ ] **Step 5: Update the graph and commit.** `graphify update .`, then commit (`docs: record dashboards in the feature inventory`).

## Deploy order

1. Merge; run `npm run db:migrate:deploy:prod -w web` **before** the deploy lands (human-run).
2. Push to `staging` first. The dev database is already seeded, so check every dashboard there.
3. Promote to `master`. Confirm prod shows empty states and no demo rows:

```sql
SELECT (SELECT count(*) FROM wallet_transactions WHERE is_demo) AS tx,
       (SELECT count(*) FROM campaign_daily_stats WHERE is_demo) AS stats,
       (SELECT count(*) FROM invoices WHERE is_demo) AS invoices,
       (SELECT count(*) FROM campaigns WHERE notes = '[demo-seed]') AS campaigns;
-- expected: 0, 0, 0, 0
```

4. Soften the site's "every play is logged" copy before Reports reaches real advertisers (spec §5).

## Later, not in this plan

Spec §11 holds the full list by dashboard, with what each one needs. The first three to pick up:

- Decide the billing rule, then write `spend` rows automatically and connect invoices to the ledger.
- Pesapal webhook writes `wallet_transactions` with `provider = 'pesapal'`, and online top-up returns.
- Play log and GPS pings write `campaign_daily_stats` with `source = 'logged'`.
