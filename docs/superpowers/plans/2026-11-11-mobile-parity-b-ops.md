# Plan B: ops-mobile parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ops-mobile does what the ops console does: real Finances and payouts, the four dashboards, the attention queue, users, bulk review, exports, and the remaining detail gaps.

**Architecture:** The SQL the ops web server runs for finance, dashboards and the attention queue moves into a new `@workspace/ops-queries` package (functions take a `Db`). Ops web keeps calling it through its cached wrappers, unchanged in behaviour; the API serves the same functions under `/v1/ops/*`; `@workspace/ops-api-client` gets typed methods; ops-mobile screens use them with the Plan A primitives.

**Tech Stack:** Next.js API routes, `pg`, vitest (DB-backed route tests), Expo / expo-router, TanStack Query, `@workspace/mobile-charts`.

**Spec:** [2026-11-11-mobile-parity-overview.md](./2026-11-11-mobile-parity-overview.md) (ops-mobile gap table and Decisions)

## Global Constraints

- Everything in the overview's Global Constraints section applies. Plan A must be merged first.
- **Permissions mirror ops web exactly.** Finance endpoints: `finances`. Disburse and retry: `payouts`. Dashboards: Campaigns and Advertisers `campaigns`, Fleet `drivers`, Support `support`; money fields only when the caller also has `finances` (`role === "admin" || permissions.includes("finances")`), the Support dashboard's safety section only with `safety` (same rule as `apps/ops/lib/dashboard-access.ts` `has()`). Users, Team, Integrations: ops admin (`requireOpsAdminAccess`).
- Money hidden means **absent from the response**, not just hidden on screen.
- Range parameter: `range` in `DATE_RANGE_KEYS`, anything else is `400` (the web silently falls back to `30d`; an API should say no).
- Ops web behaviour, numbers and caching must not change in Task 1. Its `unstable_cache` wrappers and `FINANCE_CACHE_TAG` stay in `apps/ops`.
- Wording on mobile copies ops web (`Send KES {total} to {n} drivers`, `Nothing was sent`, `Some payouts weren't sent`, `Not sent`, `Save as pending`, `Disburse`, `Retry`, `Refund to payer`).

## Review Focus

- **Disburse with a short Paystack balance** must be blocked before sending, with the balance and the required amount shown, exactly as the web dialog does (API answers `402 { balanceKes, requiredKes }`). Test in Task 4: the confirm button is disabled and the 402 body is rendered when the mocked `disburse` rejects with 402.
- **Partial disbursement** (Paystack refuses some rows): the receipt must be titled "Some payouts weren't sent" and list each Not sent reason; never "Payouts sent". Task 4 renders `PayoutDisburseResult` with both `saved` and `skipped` populated.
- **A viewer without `finances` opening a dashboard** must get no money keys in the JSON at all. Pinned by Task 5's API test asserting `"spend" in body` is false.
- **Double-tap on Disburse / Refund / Record** must not send twice: buttons disable while the mutation is pending (`isPending`), and refunds and payouts rely on the API's idempotent references. Checked in Tasks 3 and 4.
- **Stale unseen-payments badge**: after opening the Ledger the badge must drop to 0 without a relaunch: `POST /v1/ops/payments/seen` then invalidate `["ops-unseen-payments"]`. Task 3.

---

### Task 1: `@workspace/ops-queries` package

**Files:**
- Create: `packages/ops-queries/{package.json,tsconfig.json,eslint.config.js}` (copy from `packages/ops-contracts`, name `@workspace/ops-queries`, export `".": "./src/index.ts"`, deps `@workspace/ops-contracts`, peer `pg` types only via `devDependencies: { "@types/pg" }`)
- Create: `packages/ops-queries/src/db.ts` (`type Db = { query<R = unknown>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }> }`, plus the `rows()` / `num()` helpers now private to `apps/ops/lib/queries/finance.ts`)
- Move (and change every query function's first parameter to `db: Db`): `apps/ops/lib/queries/{finance,campaign-analytics,fleet-analytics,advertiser-analytics,support-analytics,action-queue}.ts` → `packages/ops-queries/src/*.ts`
- Move pure constants: `apps/ops/lib/queries/finance-constants.ts` (`DELETED_ORG`, `NO_CAMPAIGN`, `INACTIVE_AFTER_DAYS`, `payoutStatus`) → `packages/ops-contracts/src/finance-constants.ts` (mobile needs `payoutStatus`; mobile must never import `@workspace/ops-queries`)
- Move pure helpers: `apps/ops/lib/integration-costs.ts` → `packages/ops-contracts/src/integration-costs.ts` (with its seed list); `IntegrationDto` and a SQL `queryIntegrations(db)` go into `packages/ops-queries/src/integrations.ts`
- Move DTO types (`FinanceOverviewDto`, `FinanceLedgerDto`, `LedgerRowDto`, `WalletRowDto`, `WalletStatus`, `FinancePayoutsDto`, `PayoutRowDto`, `AttentionItemDto`, `RecordOptionsDto`, `PipelineDto`, `ReviewQueueRow`, `DeliveryDto`, `CampaignHealthRow`, `InventoryDto`, `FleetDashboardDto`, `FleetQueueRow`, `FleetMoney`, `SupportDashboardDto`, `OldestCaseRow`, `SafetySummary`, `ActionQueueItem`, `IntegrationDto`) → `packages/ops-contracts/src/ops-dashboards.ts`, exported from the index, so mobile can type responses without importing a DB package
- Modify: `apps/ops/lib/queries/*.ts` become wrappers: `export const getFinanceOverview = unstable_cache((range) => queryFinanceOverview(getPgPool(), range), …)` with the **same** keys, tags and revalidate values as today
- Modify: `apps/ops/package.json`, `apps/api/package.json` (add `@workspace/ops-queries`)

**Interfaces:**
- Produces: `queryFinanceOverview(db, range)`, `queryFinanceLedger(db, range)`, `queryFinanceWallets(db)`, `queryFinancePayouts(db, range)`, `queryPaymentsNeedingAttention(db)`, `queryRecordOptions(db)`, `countUnseenPayments(db): Promise<number>`, `markPaymentsSeen(db): Promise<number>`, `toolMonthlyKes(db)`, `queryIntegrations(db)`, `queryPipeline(db, range, includeMoney)`, `queryDelivery(db, range)`, `queryInventory(db, range, includeMoney)`, `queryFleet(db, range, includeMoney)`, `queryAdvertisers(db, range, includeMoney)`, `querySupport(db, range, includeSafety)`, `queryActionQueue(db, has: (p: OpsPermission) => boolean): Promise<ActionQueueItem[]>`
- Signature changes only: no SQL text changes in this task.

- [ ] **Step 1: Snapshot today's numbers.** With ops running locally against the dev DB, save the JSON of `getFinanceOverview("30d")`, `getPipeline("30d", true)`, `getFleet("30d", true)` and `getSupport("30d", true)` to the scratchpad (a throwaway `tsx` script calling the existing functions).
- [ ] **Step 2: Create the package and move the code** as listed. `getActionQueue` becomes `queryActionQueue(db, has)` composing the uncached `query*` functions; ops web's `getActionQueue` wrapper passes its `has`.
- [ ] **Step 3: Verify nothing moved numerically.** Re-run the snapshot script against the wrappers and diff. Expected: identical JSON. Run `npm run typecheck -w ops -w api -w @workspace/ops-queries -w @workspace/ops-contracts` and `npm run build -w ops`. Expected: clean.
- [ ] **Step 4: Commit** `git commit -m "refactor(ops): move finance, dashboard and queue SQL into @workspace/ops-queries"`

### Task 2: Finance read endpoints

**Files:**
- Create: `apps/api/lib/ops-db.ts` (`opsDb(): Db`, the API's existing `getPgPool()`)
- Create routes under `apps/api/app/v1/ops/`: `finance/overview/route.ts`, `finance/ledger/route.ts`, `finance/wallets/route.ts`, `finance/payouts/route.ts`, `finance/attention/route.ts`, `finance/record-options/route.ts`, `finance/tool-costs/route.ts`, `payments/unseen/route.ts` (GET count, POST mark seen)
- Modify: `packages/ops-api-client/src/index.ts` (`finance.overview(range)`, `finance.ledger(range)`, `finance.wallets()`, `finance.payouts(range)`, `finance.attention()`, `finance.recordOptions()`, `finance.toolCosts()`, `finance.unseenCount()`, `finance.markSeen()`)
- Test: `apps/api/app/v1/ops/finance/finance-reads.test.ts`
- Create: Bruno requests in `bruno/business-api/admin/finance/` for each route; Modify: `docs/api/API.md` (Finance (ops) table)

**Interfaces:**
- Consumes: Task 1 functions, DTO types from `@workspace/ops-contracts`.
- Produces: `GET /v1/ops/finance/{overview,ledger,payouts}?range=` → the matching DTO; `GET /v1/ops/finance/{wallets,attention,record-options,tool-costs}`; `GET /v1/ops/payments/unseen` → `{ count: number }`; `POST /v1/ops/payments/unseen` → `{ marked: number }`. All `requireOpsPermissionAccess("finances")`.

- [ ] **Step 1: Write the failing test** (pattern: `apps/api/app/v1/customer/finance/finance.test.ts`, mock `requireOpsPermissionAccess`): without `finances` every route is `403`; `range=bogus` is `400`; overview with `range=30d` is `200` and every number in it is finite (`expectFinite`); `POST payments/unseen` then `GET` returns `{ count: 0 }`.
- [ ] **Step 2: Run** `npm test -w api -- app/v1/ops/finance/finance-reads.test.ts`. Expected: FAIL (404s).
- [ ] **Step 3: Implement the routes, client methods, Bruno requests and API.md rows.**
- [ ] **Step 4: Run** the test again and `npm run typecheck -w api -w @workspace/ops-api-client`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(api): ops finance read endpoints for ops-mobile"`

### Task 3: ops-mobile Finances: Overview, Ledger, Wallets, Tool costs, Refund, Record

**Files:**
- Replace: `apps/ops-mobile/app/(ops)/finances.tsx` (delete the `TRANSACTIONS` array and everything fake)
- Create: `apps/ops-mobile/components/finances/{overview-tab,ledger-tab,wallets-tab,tool-costs-tab,refund-sheet,record-transaction-sheet}.tsx`, `apps/ops-mobile/lib/use-finance.ts` (query hooks; keys under `["ops-finance", …]` and `["ops-unseen-payments"]`)
- Modify: `apps/ops-mobile/components/app/nav-drawer.tsx` (Finances badge = unseen count, only when the user has `finances`)

**Interfaces:**
- Consumes: Task 2 client methods; existing `client.finance.refund`, `client.finance.recordTransaction`, `client.payouts.paystackBalance`; Plan A `SegmentTabs`, `RangeToolbar`, `KpiStrip`, `ChartCard`, `TrendChart`, `DonutChart`, `StackedBars`, `LedgerList`, `AlertStrip`, `StatusPill`.

- [ ] **Step 1: Build the tabs** `Overview | Ledger | Wallets | Payouts | Tool costs` (Payouts is Task 4; show the tab, render a "coming next" placeholder until then). Overview: live Paystack balance, Needs attention list first when non-empty (payout rows switch to the Payouts tab), KPIs and charts as on web, **Refund** and **New payout run** actions. Ledger: rows with kind, org, amount, filters; **Record transaction** sheet with the web's rules (positive amount unless adjustment, category for spend/refund, "Refund to payer" kind); opening the tab calls `markSeen()` and invalidates the badge. Wallets: per-org balance, committed, status pill. Tool costs: monthly USD and KES totals plus a donut by category.
- [ ] **Step 2: Gate the screen** on `finances` (no request is made without it; show "You don't have access to Finances").
- [ ] **Step 3: Verify.** `npm run typecheck -w ops-mobile && npm run lint -w ops-mobile`. Manual on staging: the overview figures match `ops.staging.admobihq.com/finances` for the same range; record a KES 1 adjustment and see it in both ledgers; the drawer badge clears after opening Ledger; a user without `finances` sees the no-access state.
- [ ] **Step 4: Commit** `git commit -m "feat(ops-mobile): real Finances (overview, ledger, wallets, tool costs, refund, record)"`

### Task 4: ops-mobile Payouts: run, save, disburse, retry

**Files:**
- Create: `apps/ops-mobile/components/finances/{payouts-tab,payout-run-screen,disburse-sheet,payout-receipt}.tsx`; route `apps/ops-mobile/app/(ops)/finances/payout-run.tsx` (full screen, month param)

**Interfaces:**
- Consumes: `client.finance.payouts(range)` (Task 2), existing `client.payouts.getRun(month)`, `saveRun`, `disburse(ids)`, `retry(id)`, `paystackBalance()`; `payoutStatus` from `@workspace/ops-contracts` (moved there in Task 1).

- [ ] **Step 1: Payouts tab:** the month's payouts with status (Pending / Sending / Settled / Failed / Reversed), Paystack's failure reason under failed rows, **Retry** on failed rows (needs `payouts`).
- [ ] **Step 2: Payout run screen:** pick a month, list approved drivers with method and last 4 digits, type amounts, **Save as pending** (`finances`); rows already sent are read-only.
- [ ] **Step 3: Disburse sheet** (`payouts` only): select pending/failed rows, show count, total, estimated fees and live balance, block when short; **Send KES {total} to {n} drivers**; then the receipt: lines per driver sent, fees, total, **Not sent** with reasons; titles per the Global Constraints wording.
- [ ] **Step 4: Verify.** typecheck + lint. Manual on staging with the Paystack **test** key: save a run for one test driver at KES 10, disburse it, see the receipt, see the status move to Sending then Settled after the webhook; with the balance short, Send is disabled and the 402 numbers show. Ask for an advisor check before finishing this task.
- [ ] **Step 5: Commit** `git commit -m "feat(ops-mobile): payout runs, disbursement and retry"`

### Task 5: Dashboards (API + four screens)

**Files:**
- Create routes: `apps/api/app/v1/ops/dashboards/{campaigns,fleet,advertisers,support}/route.ts`; client methods `dashboards.campaigns(tab, range)`, `dashboards.fleet(range)`, `dashboards.advertisers(range)`, `dashboards.support(range)`; Bruno requests; API.md rows
- Test: `apps/api/app/v1/ops/dashboards/dashboards.test.ts`
- Create: `apps/ops-mobile/app/(ops)/dashboards/{campaigns,fleet,advertisers,support}.tsx`, `apps/ops-mobile/components/dashboards/*.tsx`; drawer entries under a "Dashboards" group (shown per permission)

**Interfaces:**
- Produces: `GET /v1/ops/dashboards/campaigns?tab=pipeline|delivery|inventory&range=` → `PipelineDto | DeliveryDto | InventoryDto`; the others → their DTOs. Permission per Global Constraints; `includeMoney` / `includeSafety` computed from the caller's access.

- [ ] **Step 1: Failing test:** campaigns dashboard without `campaigns` is 403; with `campaigns` but not `finances`, the pipeline body has no money keys (assert on the exact keys the web hides when `includeMoney` is false); support without `safety` has no safety section; bad `tab` is 400.
- [ ] **Step 2: Run** `npm test -w api -- app/v1/ops/dashboards`. Expected: FAIL.
- [ ] **Step 3: Implement routes, client methods, Bruno, API.md.** Run the test: PASS.
- [ ] **Step 4: Build the four screens** mirroring the web tabs and cards (`apps/ops/components/dashboards/*`), with `RangeToolbar` and skeletons.
- [ ] **Step 5: Verify** typecheck + lint (api, ops-api-client, ops-mobile). Manual: each screen's headline numbers match the web dashboard for the same range on staging; a role without `finances` sees no money.
- [ ] **Step 6: Commit** `git commit -m "feat: ops dashboards API and ops-mobile dashboard screens"`

### Task 6: Attention queue (header bell)

**Files:**
- Create route `apps/api/app/v1/ops/action-queue/route.ts` (any ops user; items filtered by the caller's permissions via `queryActionQueue(db, has)`), client `actionQueue.list()`, Bruno, API.md; test in `apps/api/app/v1/ops/action-queue/action-queue.test.ts` (a role with only `support` gets no campaign items)
- Rename: `apps/ops-mobile/app/(ops)/notifications.tsx` → `notification-preview.tsx` (keep the Profile link to it)
- Create: `apps/ops-mobile/app/(ops)/notifications.tsx` (the queue: grouped items, tap opens the record); Modify: the app-bar bell opens it and shows the item count

- [ ] **Step 1: Failing API test; run; implement; pass** (`npm test -w api -- app/v1/ops/action-queue`).
- [ ] **Step 2: Build the screen; wire the bell.** Pull-to-refresh; refetch on focus.
- [ ] **Step 3: Verify** typecheck + lint; manual: the queue matches `ops.staging…/notifications` for the same user.
- [ ] **Step 4: Commit** `git commit -m "feat: ops attention queue on mobile"`

### Task 7: Users (customers / admins)

**Files:** Create `apps/ops-mobile/app/(ops)/users/{index,[id]}.tsx` with Customers / Admins segments; drawer entry (ops admin only).

- [ ] **Step 1: Build** list with search (debounced) and paging via `client.users.list({ type, query, limit, offset })`; detail shows what the web Users page shows.
- [ ] **Step 2: Verify** typecheck + lint; manual: search finds a known customer on staging; a non-admin doesn't see the entry and gets 403 handled as no-access.
- [ ] **Step 3: Commit** `git commit -m "feat(ops-mobile): users screen"`

### Task 8: Bulk review

**Files:** Modify `apps/ops-mobile/app/(ops)/campaigns/index.tsx`, `apps/ops-mobile/app/(ops)/driver-applications/index.tsx`; create `apps/ops-mobile/components/app/selection-bar.tsx`.

- [ ] **Step 1: Long-press enters selection mode** (checkboxes, count, Approve / Reject); changing filter or search clears the selection (web rule). Reject asks for one reason. Confirm states the count. Calls `client.campaigns.bulkReview` / `client.driverApplications.bulkReview`; result banner "2 approved, 1 skipped (not in review)".
- [ ] **Step 2: Verify** typecheck + lint; manual on staging with two submitted test campaigns.
- [ ] **Step 3: Commit** `git commit -m "feat(ops-mobile): bulk approve and reject"`

### Task 9: List exports (CSV and PDF)

**Files:** Create `apps/ops-mobile/lib/export-list.ts` (`exportRows(kind: "csv" | "pdf", entity, title, headers, rows)`: CSV via `toCsv` from `@workspace/ops-contracts/format` written with `expo-file-system`; PDF via `client.exportPdf`, checked for `%PDF`; filename from `exportFileName()`; shared with `expo-sharing`). Modify `components/entity/EntityList.tsx` (Export menu: visible page, or selected rows when Task 8's selection is active). Add `expo-file-system` to ops-mobile's `package.json` (already compiled in through `expo`; no new build).

- [ ] **Step 1: Implement and wire** into every entity list and Team/Roles.
- [ ] **Step 2: Verify** typecheck + lint; manual: export Drivers as CSV and PDF on Android, open both from the share sheet.
- [ ] **Step 3: Commit** `git commit -m "feat(ops-mobile): export lists as CSV or PDF"`

### Task 10: Detail gaps: SOS photos, campaign funding, announcement composer

**Files:** Modify `apps/ops-mobile/app/(ops)/sos/[id].tsx` (photo gallery through `client.safety.photoFileUrl` with the bearer token; drop the "open in the ops console" line; add Google Maps link for the coordinates); `apps/ops-mobile/app/(ops)/campaigns/[id].tsx` (**Funded** with held amount / **Not funded**); `apps/ops-mobile/app/(ops)/announcements/new.tsx` and the list's detail view (Personalise buttons inserting `{{first_name}}` / `{{org_name}}` at the cursor of the last-focused field, live preview with `renderAnnouncementTemplate` and sample values "Jordan" / "Acme Ads" with a Customer / Driver switch, counts against 65 / 178, detail view with the delivery bar).

- [ ] **Step 1: Implement the three.**
- [ ] **Step 2: Verify** typecheck + lint; manual: an SOS with photos on staging shows them; a funded campaign shows the held amount; preview renders merge tags.
- [ ] **Step 3: Commit** `git commit -m "feat(ops-mobile): SOS photos, campaign funding and announcement preview"`

### Task 11: Integrations ledger

**Files:**
- Create routes: `apps/api/app/v1/ops/integrations/route.ts` (GET list + totals, POST create), `apps/api/app/v1/ops/integrations/[id]/route.ts` (PATCH, DELETE), all `requireOpsAdminAccess`; validation schema in `@workspace/ops-contracts` reused by the ops server actions (`app/(dashboard)/settings/(prefs)/integrations/actions.ts` switches to it so both paths validate the same way); audit events like the server actions write; client `integrations.*`; Bruno; API.md
- Test: `apps/api/app/v1/ops/integrations/integrations.test.ts` (non-admin 403; create → list contains it with the monthly USD/KES the web shows; delete removes it)
- Create: `apps/ops-mobile/app/(ops)/settings/integrations.tsx` (+ edit sheet), Settings row for admins

- [ ] **Step 1: Failing test; run; implement API; pass.**
- [ ] **Step 2: Build the screen** (totals, pie by category, list, add/edit/delete).
- [ ] **Step 3: Verify** typecheck + lint (api, ops, ops-mobile); manual: an integration added on mobile appears on ops web with the same totals.
- [ ] **Step 4: Commit** `git commit -m "feat: integrations ledger API and ops-mobile screen"`

### Task 12 (lowest priority): Demo fleet on the mobile map

**Files:** Move `apps/ops/components/maps/demo-fleet/{fleet.ts,routes.json}` and the ads data into `packages/ops-contracts/src/demo-fleet/` (pure, time-based; keep `fleet.test.ts` passing there with vitest); ops web imports from the package; ops-mobile `components/maps/ops-map-*.tsx` render vehicles, the Vehicles / Campaigns tabs and Needs attention from the same functions. The rail footer says the fleet is simulated, as on web.

- [ ] **Step 1: Move the sim and its test;** `npm test -w @workspace/ops-contracts` passes; ops web map unchanged.
- [ ] **Step 2: Render on mobile.** Verify typecheck + lint and a dev build (MapLibre native).
- [ ] **Step 3: Commit** `git commit -m "feat(ops-mobile): simulated demo fleet on the map"`

### Task 13: Docs

- [ ] Update `docs/ops/MOBILE-OPS.md` (one section per new screen), `docs/ops/OPS-ADMIN.md` (mention the API endpoints now behind Finances / dashboards / queue and that the SQL lives in `@workspace/ops-queries`), `docs/shared/ARCHITECTURE.md` (the package). Commit `docs: ops-mobile parity`.
