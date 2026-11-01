# Dashboards & Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give ops five dashboards and advertisers three, all reading real tables, with seeded demo rows on the dev database so they look complete on local and staging while prod shows honest empty states.

**Architecture:** Three additive tables (`wallet_transactions`, `campaign_daily_stats`, `payouts`) hold the data. Ops reads them with raw SQL in `apps/ops/lib/queries/`; advertisers read them through new org-scoped `/v1/customer/*` routes. A shared chart kit in `packages/ui` renders both. A guarded seed script fills the dev database.

**Tech Stack:** Next.js App Router, Prisma 7 with hand-written SQL migrations, `pg`, TanStack Query v5, Recharts 3 via `@workspace/ui`, Zod, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-01-dashboards-and-charts-design.md](../specs/2026-11-01-dashboards-and-charts-design.md)

**Media page:** separate plan. See the 2026-11-01 addendum on [2026-10-01-media-library.md](2026-10-01-media-library.md).

## Global Constraints

- **No new dependencies.** Charts use Recharts through `@workspace/ui`.
- **Never commit a `Co-Authored-By` trailer or AI attribution** (CLAUDE.md).
- **Migrations are additive** and deploy before the code (`docs/shared/DEPLOYMENT.md`). Never run `db:push` on a shared database.
- **The seed never runs on prod.** No `:prod` npm script. The guard fails closed.
- **Money:** KES, formatted only with `formatKes`. SQL sums in `numeric`; convert to `Number` once, at the DTO boundary.
- **Days are Africa/Nairobi calendar days.** Use `AT TIME ZONE 'Africa/Nairobi'` when bucketing `occurred_at`.
- **Org scoping:** every advertiser query filters on `auth.access.orgId`. Cross-org access answers with no data, never another org's rows.
- **Impressions are labelled "Est."** on every surface.
- **Chart rules:** one y-axis, 2px lines, legend for 2+ series, tooltip on every chart, table view in `ChartCard`, at most 5 categories then "Other", color by entity not rank, text uses text tokens.
- **Empty is not broken:** with no rows, KPIs read `0` or `—` and each chart shows its empty message.
- **Copy:** plain language, no "AI", no exclamation marks. Empty message for delivery data: "Delivery numbers appear here once your campaigns are reporting."
- After code changes, run `graphify update .`.

## Review Focus

1. **A brand-new org on prod (zero rows).** Every endpoint and dashboard returns zeros and empty arrays, never `NaN`, `Infinity` or a 500. Cost per 1,000 with 0 impressions is `null`, shown as `—`. Pinned in Tasks 2 and 5.
2. **A Member without `billing:read` opens the wallet or Overview.** They get a calm access message on the wallet and no spend tiles on Overview, not an error toast. Pinned in Tasks 5 and 6.
3. **Org A's user requests data while org B has rows.** Org A sees only its own totals, including when a transaction's `campaign_id` belongs to another org. Pinned in Task 5.
4. **`DATABASE_URL` is prod through any spelling** (pooled host, `POSTGRES_URL`, unparseable string). The seed exits before opening a connection. Pinned in Task 3.
5. **Seed re-run, or a transaction whose org or campaign was deleted.** Totals don't double, and ops shows "Deleted organization" or "No campaign" rather than dropping the row and breaking reconciliation. Pinned in Tasks 3 and 8.

## File Structure

```
apps/web/prisma/schema.prisma                                 + 3 models, relations on Campaign, AdvertiserOrg, Driver
apps/web/prisma/migrations/20261101090000_dashboard_ledger/   additive SQL
packages/ops-contracts/src/analytics.ts (+ .test.ts)          DTOs and pure maths for both apps
packages/ops-contracts/src/format.ts                          + formatKes, formatCompact
apps/api/scripts/seed-demo-data.ts (+ .test.ts)               guarded seed
apps/api/lib/analytics/customer-analytics.ts                  org-scoped queries
apps/api/app/v1/customer/wallet/route.ts                      GET wallet summary
apps/api/app/v1/customer/reports/route.ts                     GET report summary
packages/ui/src/components/charts/*                           chart kit
apps/customer-web/lib/analytics-client.ts, use-analytics.ts   fetch + hooks
apps/customer-web/components/wallet/wallet-view.tsx           rebuilt
apps/customer-web/components/reports/reports-view.tsx         new
apps/ops/lib/queries/{finance,campaign-analytics,fleet-analytics,support-analytics}.ts
apps/ops/components/finances/finance-view.tsx                 rebuilt
apps/ops/app/(dashboard)/dashboards/{campaigns,fleet,support}/page.tsx
apps/ops/components/dashboards/*-dashboard.tsx
```

Deleted by the end: `apps/ops/lib/placeholder-data.ts`, `apps/customer-web/lib/placeholder-data.ts`, `apps/customer-web/lib/wallet.ts`. Each is imported only by the view being rebuilt.

---

### Task 1: Ledger tables

**Files:**
- Modify: `apps/web/prisma/schema.prisma`, `docs/shared/DATABASE.md`, `docs/shared/DATA-LAYER.md`
- Create: `apps/web/prisma/migrations/20261101090000_dashboard_ledger/migration.sql`

**Interfaces:**
- Produces: Prisma models `WalletTransaction`, `CampaignDailyStat`, `Payout`, with fields exactly as in spec §3.

- [ ] **Step 1: Add the models.** Indexes: `wallet_transactions (org_id, occurred_at)`, `(occurred_at)`, `(is_demo)`; `campaign_daily_stats (day)`, `(market, day)`, unique `(campaign_id, day, market)`; `payouts (status, period_month)`, `(driver_id)`, `(is_demo)`. `day` and `period_month` are `@db.Date`. Money is `Decimal(12, 2)`. Add a doc comment on `WalletTransaction` stating it is append-only and that balance is always derived.
- [ ] **Step 2: Generate the SQL without applying it.** Run `npx prisma migrate diff` from `apps/web` against the migrations directory, save the output as `migration.sql`, and read it. Expected: only `CREATE TABLE`, `CREATE INDEX` and `ADD CONSTRAINT`, with no `DROP` and no touch on `cms` or `n8n` schemas.
- [ ] **Step 3: Apply to dev.** Run `npm run db:migrate:deploy -w web`, then `npm run db:migrate:status -w web`. Expected: "Database schema is up to date".
- [ ] **Step 4: Update docs.** Add the three tables to `DATABASE.md`. In `DATA-LAYER.md`, state that `campaign_daily_stats` is delivery aggregates and `campaign_placements` remains reserved for dispatch.
- [ ] **Step 5: Commit** (`feat(db): add wallet ledger, daily campaign stats and payouts`). Stage by path; a second agent may share the tree.

### Task 2: Shared contracts and maths

**Files:**
- Create: `packages/ops-contracts/src/analytics.ts`, `packages/ops-contracts/src/analytics.test.ts`
- Modify: `packages/ops-contracts/src/index.ts`, `packages/ops-contracts/src/format.ts`

**Interfaces:**
- Consumes: `DateRangeKey` from `./enums`.
- Produces:
  - `type NamedValue = { name: string; value: number }`
  - `type DailyPoint = { day: string; [series: string]: number | string }`
  - `foldOther(rows: NamedValue[], max?: number): NamedValue[]` (default 5 total, sorted descending, tail summed into `"Other"`)
  - `fillDays(rows: DailyPoint[], start: string, end: string, keys: string[]): DailyPoint[]`
  - `costPerThousand(spendKes: number, impressions: number): number | null`
  - `netMargin(input: { revenueKes: number; payoutsKes: number; toolsMonthlyKes: number; rangeDays: number }): number`
  - `rate(part: number, whole: number): number | null`
  - `SPEND_CATEGORIES`, `SPEND_CATEGORY_LABELS`
  - `WalletSummaryDto`: `{ balanceKes, toppedUpKes, spentKes, committedKes, byCategory: NamedValue[], byCampaign: NamedValue[], monthly: DailyPoint[], transactions: WalletTransactionDto[] }`
  - `ReportSummaryDto`: `{ impressions, spendKes, costPerThousand: number | null, vehicleHours, distanceKm, daily: DailyPoint[], byMarket: NamedValue[], byFormat: NamedValue[], byWeekday: NamedValue[], campaigns: CampaignReportRow[] }`
  - In `format.ts`: `formatKes(value: number): string` (`"KES 1,200"`, en-KE, no decimals) and `formatCompact(value: number): string` (`"1.2M"`).

- [ ] **Step 1: Write the failing tests.**

```ts
expect(foldOther([{name:"a",value:9},{name:"b",value:8},{name:"c",value:7},{name:"d",value:6},{name:"e",value:5},{name:"f",value:4}]))
  .toEqual([{name:"a",value:9},{name:"b",value:8},{name:"c",value:7},{name:"d",value:6},{name:"Other",value:9}])
expect(foldOther([{name:"a",value:1}])).toEqual([{name:"a",value:1}])
expect(foldOther([])).toEqual([])
expect(fillDays([{day:"2026-01-02",n:3}],"2026-01-01","2026-01-03",["n"]))
  .toEqual([{day:"2026-01-01",n:0},{day:"2026-01-02",n:3},{day:"2026-01-03",n:0}])
expect(costPerThousand(5000, 1000000)).toBe(5)
expect(costPerThousand(5000, 0)).toBeNull()
expect(rate(1, 0)).toBeNull()
expect(netMargin({revenueKes:100000,payoutsKes:40000,toolsMonthlyKes:30000,rangeDays:30})).toBe(30000)
expect(netMargin({revenueKes:0,payoutsKes:0,toolsMonthlyKes:30000,rangeDays:7})).toBe(-7000)
expect(formatKes(1200)).toBe("KES 1,200")
expect(formatCompact(1200000)).toBe("1.2M")
```

- [ ] **Step 2: Run to confirm failure.** `npm test -w @workspace/ops-contracts`. Expected: FAIL, functions not exported.
- [ ] **Step 3: Implement.** Scale tools cost as `toolsMonthlyKes * rangeDays / 30`. `fillDays` iterates date strings in UTC so a DST-free loop can't skip a day.
- [ ] **Step 4: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit** (`feat(contracts): add analytics DTOs and helpers`).

### Task 3: Guarded demo seed

**Files:**
- Create: `apps/api/scripts/seed-demo-data.ts`, `apps/api/scripts/seed-demo-data.test.ts`
- Modify: `apps/api/package.json`, `docs/shared/DEV-SETUP.md`

**Interfaces:**
- Consumes: Task 1 models; `SPEND_CATEGORIES`.
- Produces:
  - `assertDevDatabase(url: string | undefined): void` (throws)
  - `planOrgDemo(orgId: number, ownerClerkId: string, today: Date, seed: number): { campaigns; stats; transactions }` (pure)
  - `resetDemoData(): Promise<void>`, `seedDemoData(options: { orgId?: number }): Promise<void>`
  - npm script `seed:demo`: `dotenv -e .env.local -- tsx scripts/seed-demo-data.ts`

Demo markers, used by reset:

| Rows | Marker |
|---|---|
| ledger tables | `is_demo = true` |
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
it("wallet history reconciles", () => {
  const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
  const sum = plan.transactions.reduce((t, x) => t + x.amount_kes, 0)
  expect(sum).toBeGreaterThan(0)                                 // balance never negative overall
  expect(plan.transactions.filter(t => t.kind === "spend").every(t => t.amount_kes < 0 && t.spend_category)).toBe(true)
  expect(new Set(plan.stats.map(s => `${s.campaign_id}-${s.day}-${s.market}`)).size).toBe(plan.stats.length)
})
it("is deterministic", () => {
  const today = new Date("2026-11-01")
  expect(planOrgDemo(1, "u", today, 42)).toEqual(planOrgDemo(1, "u", today, 42))
})
it("re-running leaves the same row count and removes nothing real", async () => { /* testDatabaseUrl(); insert a real wallet row and campaign; seed twice; counts equal; real rows survive */ })
```

- [ ] **Step 3: Run to confirm failure.** `npm test -w api -- seed-demo-data`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement.** `assertDevDatabase(resolveDatabaseUrl())` runs **before** `new PrismaClient`. Use a small seeded PRNG (mulberry32) with no `Math.random`. For each org with an active owner: 4 to 6 campaigns with a mix of status, market and format and dates spanning the past 180 days plus upcoming; weekly stats shape with a weekday dip; spend split about 70/10/8/12 across `screen_time`, `production`, `service_fee`, `tax` (placeholder ratios); top-ups that keep the running balance positive. Then global rows: 40 CRM drivers, 40 driver profiles across statuses, monthly payouts, 60 support cases, 12 safety incidents. Reset and insert run in one `$transaction`. Print a count per table and the host it wrote to.
- [ ] **Step 5: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 6: Seed dev.** Run `npm run seed:demo -w api`. Expected: counts printed; a second run prints the same counts.
- [ ] **Step 7: Document** in `DEV-SETUP.md`: the command, that one run covers local and staging, and how to re-run after schema changes.
- [ ] **Step 8: Commit** (`feat(api): add dev-only demo data seed`).

### Task 4: Chart kit

**Files:**
- Create in `packages/ui/src/components/charts/`: `chart-card.tsx`, `trend-chart.tsx`, `donut-chart.tsx`, `rank-bar-chart.tsx`, `funnel-bars.tsx`, `weekday-heatmap.tsx`
- Modify: `packages/ui/src/styles/globals.css` (only if the palette fails). The existing `./components/*` export already covers `@workspace/ui/components/charts/*`.

**Interfaces:**
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend` from `chart.tsx`.
- Produces:
  - `ChartCard({ title, description?, isEmpty, emptyMessage, table?: { columns: string[]; rows: string[][] }, children })`
  - `TrendChart({ data: DailyPoint[]; series: { key: string; label: string; color?: string }[]; stacked?: boolean; valueFormatter? })`
  - `DonutChart({ data: NamedValue[]; centerLabel?; valueFormatter? })`
  - `RankBarChart({ data: NamedValue[]; valueFormatter? })`
  - `FunnelBars({ steps: NamedValue[] })` (shows each step's share of the first)
  - `WeekdayHeatmap({ data: NamedValue[]; valueFormatter? })` (single-hue, Mon to Sun, CSS grid, each cell with a text label)

- [ ] **Step 1: Validate the palette.** Convert `--chart-1…5` to hex for light and dark, then run the dataviz validator: `node <dataviz skill dir>/scripts/validate_palette.js "<hexes>" --mode light`, and again with `--mode dark`. Expected: no FAIL. On FAIL, adjust only the failing token. Note: `integration-costs.ts` hardcodes its own colors; leave them.
- [ ] **Step 2: Build the kit.** `ChartCard` owns the chart/table toggle and the empty state. Color comes from `--chart-N` in array order assigned to the entity, so `DonutChart` takes stable input order rather than sorting by value at render. `DonutChart` has a 2px surface gap between segments and a legend with values. Tooltips on every mark.
- [ ] **Step 3: Check types and lint.** Run `npm run typecheck` and `npm run lint` scoped to `@workspace/ui`. Expected: clean.
- [ ] **Step 4: Commit** (`feat(ui): add shared dashboard chart kit`).

### Task 5: Advertiser API

**Files:**
- Create: `apps/api/lib/analytics/customer-analytics.ts`, `apps/api/app/v1/customer/wallet/route.ts`, `apps/api/app/v1/customer/reports/route.ts`, `apps/api/app/v1/customer/analytics.test.ts`
- Modify: `docs/api/API.md`

**Interfaces:**
- Consumes: `requireCustomerPermissionAccess`; Task 2 DTOs; `DATE_RANGE_KEYS`.
- Produces:
  - `getWalletSummary(orgId: number, range: DateRangeKey): Promise<WalletSummaryDto>`
  - `getReportSummary(orgId: number, range: DateRangeKey): Promise<ReportSummaryDto>`
  - `GET /v1/customer/wallet?range=30d` requires `billing:read`
  - `GET /v1/customer/reports?range=30d` requires `reports:read`

- [ ] **Step 1: Write the failing tests**, in the `org.test.ts` style (real test DB, mocked `api-utils`):

```ts
it("zero-row org returns zeros, not NaN", async () => {
  const body = await get("/wallet")
  expect(body).toMatchObject({ balanceKes: 0, spentKes: 0, byCategory: [], transactions: [] })
  const report = await get("/reports")
  expect(report).toMatchObject({ impressions: 0, costPerThousand: null, daily: expect.any(Array) })
})
it("balance is all-time even when the range is 7d; spent respects the range", ...)
it("org A never sees org B's money or impressions", ...)
it("a transaction on org A carrying org B's campaign is counted for A without exposing B's campaign name", ...)
it("committed is approved budgets minus spend on those campaigns, floored at 0", ...)
it("returns 403 without billing:read / reports:read", ...)
it("rejects an unknown range with 400", ...)
it("transactions are capped at 100, newest first", ...)
```

- [ ] **Step 2: Run to confirm failure.** `npm test -w api -- analytics`. Expected: FAIL, 404 or module not found.
- [ ] **Step 3: Implement.** Use `prisma.$queryRaw` with parameters for aggregates. `byWeekday` buckets in Nairobi time. `spentKes` is the absolute sum of `spend` rows net of `refund`. Report totals cover campaigns where `campaigns.org_id = orgId`; spend comes from `wallet_transactions`, never `campaign_daily_stats`. Both routes are read-only, so no audit event.
- [ ] **Step 4: Run to confirm pass.** Same command. Expected: PASS.
- [ ] **Step 5: Document** both routes in `API.md`, then run `node scripts/generate-bruno.mjs` if that is how the Bruno collection stays current.
- [ ] **Step 6: Commit** (`feat(api): add advertiser wallet and reports endpoints`).

### Task 6: Advertiser Wallet

**Files:**
- Create: `apps/customer-web/lib/analytics-client.ts`, `apps/customer-web/lib/use-analytics.ts`, `apps/customer-web/components/range-picker.tsx`
- Modify: `apps/customer-web/components/wallet/wallet-view.tsx`, `docs/customer/APP.md`
- Delete: `apps/customer-web/lib/wallet.ts`, `apps/customer-web/lib/placeholder-data.ts`

**Interfaces:**
- Consumes: Task 4 kit; Task 5 routes; `orgCan`, `useOrg`.
- Produces: `useWalletSummary(range, { enabled })`, `useReportSummary(range, { enabled })` (`staleTime` 5 minutes), `RangePicker({ value, onChange })` using the same labels as ops.

- [ ] **Step 1: Rebuild the view** per spec §5: KPI row, then **Where your money went** first, spend by campaign, monthly spend, transactions table. Remove the top-up and auto-reload panels, the balance hide toggle's local storage, and low-balance logic. "Top up" opens a dialog: "Online payments are coming soon. Your account manager can add funds to your wallet today."
- [ ] **Step 2: Handle no access.** If `!orgCan(org, "billing:read")`, render "Ask your account owner for billing access." and disable the query, so no 403 toast fires.
- [ ] **Step 3: Verify in the browser.** Run `npm run dev`, then sign in on `:3002` with a seeded org and a Member. Expected: seeded numbers reconcile (balance = topped up − spent, ignoring refunds and adjustments); a brand-new org shows empty states; a Member sees the access message; both themes render; no horizontal scroll at phone width.
- [ ] **Step 4: Update `docs/customer/APP.md`**, which should no longer describe a local wallet.
- [ ] **Step 5: Commit** (`feat(customer-web): show real wallet and where funds went`).

### Task 7: Advertiser Reports and Overview

**Files:**
- Create: `apps/customer-web/components/reports/reports-view.tsx`
- Modify: `apps/customer-web/app/(shell)/reports/page.tsx`, `apps/customer-web/components/overview/overview-view.tsx`, `apps/customer-web/lib/navigation.ts`, `apps/customer-web/app/(shell)/reports/loading.tsx` if it mismatches the new layout

**Interfaces:**
- Consumes: Task 6 hooks and `RangePicker`; Task 4 kit.

- [ ] **Step 1: Build Reports** per spec §5, replacing `ComingSoon`. A user lacking `reports:read` gets the same style of access message as the wallet.
- [ ] **Step 2: Extend Overview.** Add the three tiles and two trend charts, each gated on its permission. Update the doc comment that says impressions and spend are absent. Keep `summarize()` as is. Update the Reports nav description.
- [ ] **Step 3: Verify in the browser.** Expected: seeded org shows charts; Member sees no spend tile; new org shows the delivery empty message; changing range refetches.
- [ ] **Step 4: Commit** (`feat(customer-web): add reports dashboard and overview charts`).

### Task 8: Ops Finance

**Files:**
- Create: `apps/ops/lib/queries/finance.ts`
- Modify: `apps/ops/components/finances/finance-view.tsx`, `apps/ops/app/(dashboard)/finances/page.tsx`, `docs/ops/OPS-ADMIN.md`
- Delete: `apps/ops/lib/placeholder-data.ts`

**Interfaces:**
- Consumes: `getDateRangeStart`, `getPgPool`, `monthlyUsd` and `USD_KES` from `integration-costs.ts` (only `active` and `trial` rows, converted to KES), `netMargin`, `foldOther`, Task 4 kit. That file has its own `formatKes`; leave it alone and import the contracts one in this view.
- Produces: `getFinanceDashboard(range: DateRangeKey): Promise<FinanceDashboard>` cached with `unstable_cache`, `revalidate: 300`.

- [ ] **Step 1: Write the query** following `queryOverviewStats`. Money comes back as strings from `pg`, so convert once. Transactions `LEFT JOIN` orgs and campaigns so rows with a null org or campaign are kept, shown as "Deleted organization" / "No campaign". Wallet funds held is all-time and ignores the range.
- [ ] **Step 2: Rebuild the page** per spec §5. The page reads `searchParams.range` the way `overview/page.tsx` does and reuses `OverviewRangePicker`. Keep the existing coming-soon dialogs and the `DataTable` for transactions. Wrap the query in the same try/catch and `ApiErrorBanner` as `overview-stats.tsx`.
- [ ] **Step 3: Verify in the browser** on `:3001`. Expected: Revenue equals the sum of spend rows for the range; payouts by status sum to the payouts KPI; a user without `finances` is redirected to `/home`.
- [ ] **Step 4: Update `OPS-ADMIN.md`**, removing "sample data" from the Finances line.
- [ ] **Step 5: Commit** (`feat(ops): rebuild finance dashboard on ledger data`).

### Task 9: Ops Campaigns dashboard and sidebar group

**Files:**
- Create: `apps/ops/lib/queries/campaign-analytics.ts`, `apps/ops/app/(dashboard)/dashboards/campaigns/page.tsx`, `apps/ops/components/dashboards/campaigns-dashboard.tsx`
- Modify: `apps/ops/components/shell/ops-shell.tsx`, `apps/ops/lib/tour-chapters.ts` if it references moved items

**Interfaces:**
- Produces: `dashboardNavItems` in `ops-shell.tsx`, included in `allNavItems`; filtered with the existing `canSee`. `getCampaignDashboard(range)`.

- [ ] **Step 1: Add the sidebar group.** Move Overview and Finances into a **Dashboards** `SidebarGroup` above Operations, and add Campaigns, Fleet and Support & safety. Use distinct hrefs from the existing `/campaigns`; `isNavItemActive` matches by prefix, so `/dashboards/campaigns` stays separate. Fleet and Support links go in now and are built in Tasks 10 and 11; do Task 9 to 11 on one branch so no link ships dead.
- [ ] **Step 2: Build the query and page** per spec §5. Guard with `requireOpsPermission("campaigns")` as in `finances/page.tsx`. Approval rate uses `rate(approved, approved + rejected)`, with `changes_requested` left out as it isn't a final decision. "Live" uses `campaignFlightPhase` semantics in SQL: `status = 'approved'` and today between `starts_on` and `ends_on`.
- [ ] **Step 3: Verify in the browser.** Expected: pipeline counts match `/campaigns`; Live matches a manual count.
- [ ] **Step 4: Commit** (`feat(ops): add dashboards nav and campaigns dashboard`).

### Task 10: Ops Fleet dashboard

**Files:**
- Create: `apps/ops/lib/queries/fleet-analytics.ts`, `apps/ops/app/(dashboard)/dashboards/fleet/page.tsx`, `apps/ops/components/dashboards/fleet-dashboard.tsx`

**Interfaces:**
- Produces: `getFleetDashboard(range)`.

- [ ] **Step 1: Build the query and page** per spec §5, guarded by `requireOpsPermission("drivers")`. CRM `drivers` exclude `deleted_at IS NOT NULL`. The application funnel reads `driver_profiles.status`, since CRM `drivers.status` is a different lifecycle. Active drivers means CRM `status = 'active'`. Avg active vehicles sums `active_vehicles` per day across campaigns, then averages. Mark that with a `ponytail:` comment: it overcounts a vehicle running two campaigns until telemetry gives vehicle-level data.
- [ ] **Step 2: Verify in the browser.** Expected: drivers by city matches `/drivers` filters; zero payouts shows the empty message.
- [ ] **Step 3: Commit** (`feat(ops): add fleet dashboard`).

### Task 11: Ops Support & safety dashboard

**Files:**
- Create: `apps/ops/lib/queries/support-analytics.ts`, `apps/ops/app/(dashboard)/dashboards/support/page.tsx`, `apps/ops/components/dashboards/support-dashboard.tsx`

**Interfaces:**
- Produces: `getSupportDashboard(range)`, including `safety: {...} | null`.

- [ ] **Step 1: Build the query and page** per spec §5, guarded by `requireOpsPermission("support")`. Incident data is sensitive and has its own permission: only fetch and show incident KPIs and charts when the viewer also holds `safety` (admins pass). Open means support `status IN ('open','pending')`; incident `status IN ('new','acknowledged','in_progress')`. Severity charts use status colors with a label, not categorical ones.
- [ ] **Step 2: Verify in the browser.** Expected: a support-only role sees no incident data; totals match `/support` and `/sos`.
- [ ] **Step 3: Commit** (`feat(ops): add support and safety dashboard`).

### Task 12: Overview migration, final checks and rollout notes

**Files:**
- Modify: `apps/ops/components/overview/overview-dashboard.tsx`, `apps/ops/app/(dashboard)/settings/(prefs)/integrations/integrations-view.tsx` only if it is a straight swap, `docs/shared/FEATURE-INVENTORY.md`, `docs/shared/ROADMAP.md`

- [ ] **Step 1: Move Overview onto the kit.** Same data, `TrendChart` and `RankBarChart`. No new queries.
- [ ] **Step 2: Run everything.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Expected: all pass. Report any failure with its output.
- [ ] **Step 3: Grep for leftovers.** `placeholder-data`, `PLACEHOLDER_WALLET_BALANCE`, `SPEND_BY_CAMPAIGN` in `apps/ops` and `apps/customer-web`. Expected: none.
- [ ] **Step 4: Visual pass.** Screenshot every dashboard, light and dark, desktop and phone width, seeded and empty. Check label collisions and against the dataviz anti-patterns list. If the template demo is back up, compare layouts.
- [ ] **Step 5: Update docs.** `FEATURE-INVENTORY.md` for the new dashboards. `ROADMAP.md`: `Payout` table exists; note that telemetry and Pesapal should write to the new tables.
- [ ] **Step 6: Update the graph and commit.** `graphify update .`, then commit (`docs: record dashboards in the feature inventory`).

## Deploy order

1. Merge; run `npm run db:migrate:deploy:prod -w web` **before** the deploy lands (human-run).
2. Push to `staging` first. The dev database is already seeded, so check every dashboard there.
3. Promote to `master`. Confirm prod shows empty states and no demo rows:

```sql
SELECT (SELECT count(*) FROM wallet_transactions WHERE is_demo) AS tx,
       (SELECT count(*) FROM campaigns WHERE notes = '[demo-seed]') AS campaigns;
-- expected: 0, 0
```

## Later, not in this plan

- Pesapal webhook writes `wallet_transactions` with `provider = 'pesapal'`; add top-up back.
- Telemetry cron writes `campaign_daily_stats`.
- Mobile dashboards reuse the same endpoints and drop their local wallets.
