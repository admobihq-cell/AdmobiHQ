# Plan D: driver-mobile parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** driver-mobile does what driver-web does: the dashboard home, Earnings, Reports, the ranked Routes rail and the split Settings.

**Architecture:** No API work: payouts and profile endpoints exist. driver-web's pure logic (`lib/sample-data.ts`, `reportPeriods` in `components/reports/reports-view.tsx`, the payout grouping and sentences in `components/overview/{earnings-view,latest-payout-card}.tsx`, the date helpers in `lib/use-driver-payouts.ts`) moves into `@workspace/ops-contracts` with tests, so both apps show the same sample numbers, periods and wording. Screens use Plan A primitives.

**Tech Stack:** Expo / expo-router, TanStack Query (persisted), `@workspace/mobile-charts`, React Native `Share` (built in) for CSV; `expo-print` + `expo-sharing` only in Task 5.

**Spec:** [2026-11-11-mobile-parity-overview.md](./2026-11-11-mobile-parity-overview.md) (driver-mobile gap table)

## Global Constraints

- Everything in the overview's Global Constraints section applies. Plan A must be merged first.
- **Sample honesty:** every figure from `driver-sample` (screen time, ads, distance, areas, hours) carries `SampleTag`; the home toolbar shows a "Sample screen data" pill. Payout figures are real and never tagged.
- **Plain words** (DESIGN.md § driver): "Ads shown", "Hours a day", "Days worked", "Best times to drive", time slots like "Friday, 6–9 pm"; no "plays" or "per active day".
- Tasks 1–4 and 6 ship as an OTA update (no new native modules). Task 5 adds native modules and needs a new EAS build; don't start it without the user's go-ahead.
- `Date` never goes into a query result (persisted cache). Days are `YYYY-MM-DD` strings.

## Review Focus

- **A driver with no payouts yet**: Earnings shows the empty state and the Pay card says nothing was paid in the period; no `NaN` from `payoutsByMonth([])`. Pinned in Task 1.
- **Month and year boundaries** for Reports periods: 1 January's "Last month" is December of the previous year; a Sunday's "This week" starts the Monday before. Pinned in Task 1.
- **Failed or reversed payouts**: grouped under Problems, excluded from the Paid and On its way totals, struck through in history, and raising the home AlertStrip ("Check payout details"). Pinned in Task 1 (`payoutGroup`) and checked in Task 2.
- **Missing payout destination**: home AlertStrip asks the driver to add payout details and links to the profile step. Task 2.
- **Same sample numbers on web and phone** for the same day: both read `sampleTelemetry` from contracts. Pinned in Task 1 (determinism test) and checked in Task 2 side by side.

---

### Task 1: Move driver-web's pure logic into `@workspace/ops-contracts`

**Files:**
- Move: `apps/driver-web/lib/sample-data.ts` → `packages/ops-contracts/src/driver-sample.ts` (all exports unchanged: `SampleRange, SampleDay, SAMPLE_AREAS, WEEKDAYS, TIME_BANDS, sampleDay, SampleTelemetry, sampleTelemetry, formatHours, formatKm, bestTimes`; `shortDay` is renamed `sampleShortDay` because Plan C exports a different `shortDay` from the same package)
- Move: `reportPeriods`, `PeriodKey`, `Period` from `apps/driver-web/components/reports/reports-view.tsx` → `packages/ops-contracts/src/driver-reports.ts`
- Create: `packages/ops-contracts/src/driver-earnings.ts` from `earnings-view.tsx` (`EARNINGS_FILTERS`, `payoutGroup(p): "paid" | "on_way" | "problem"`, `payoutsByMonth(items): { period: string; label: string; paid: number; onWay: number }[]`), `latest-payout-card.tsx` (`PAYOUT_TONE`, `payoutSentence(focus, to): string`) and `lib/use-driver-payouts.ts` (`monthName`, `formatPayoutDate`)
- Modify: driver-web imports; `packages/ops-contracts/src/index.ts`
- Test: `packages/ops-contracts/src/{driver-sample,driver-reports,driver-earnings}.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
const p = (today: string) => Object.fromEntries(reportPeriods(today).map((x) => [x.key, x]))
expect(p("2026-11-11").this_week).toMatchObject({ from: "2026-11-09", to: "2026-11-11" })
expect(p("2026-11-11").last_week).toMatchObject({ from: "2026-11-02", to: "2026-11-08" })
expect(p("2026-11-11").last_month).toMatchObject({ from: "2026-10-01", to: "2026-10-31", month: "2026-10" })
expect(p("2026-11-15").this_week.from).toBe("2026-11-09")
expect(p("2026-01-05").last_month).toMatchObject({ from: "2025-12-01", to: "2025-12-31", month: "2025-12" })
expect(sampleTelemetry(range)).toEqual(sampleTelemetry(range))
expect(payoutGroup({ status: "settled" })).toBe("paid")
expect(payoutGroup({ status: "processing" })).toBe("on_way")
expect(payoutGroup({ status: "reversed" })).toBe("problem")
expect(payoutsByMonth([])).toEqual([])
expect(payoutsByMonth([settled("2026-10", 500), failed("2026-10", 300), pending("2026-11", 200)]).map(({ period, paid, onWay }) => ({ period, paid, onWay })))
  .toEqual([{ period: "2026-10", paid: 500, onWay: 0 }, { period: "2026-11", paid: 0, onWay: 200 }])
expect(payoutSentence({ kind: "in_flight", stage: 1 } as PayoutFocus, "M-Pesa •••• 1234")).toBe("Sending now to M-Pesa •••• 1234.")
```
(`range`, `settled`, `failed`, `pending` are small fixture builders in the test file.)

- [ ] **Step 2: Run** `npm test -w @workspace/ops-contracts`. Expected: FAIL.
- [ ] **Step 3: Move the code; update driver-web imports.**
- [ ] **Step 4: Run** the tests, `npm run typecheck -w driver-web`, `npm run build -w driver-web`. Expected: PASS; driver-web home, Earnings and Reports look the same on `localhost:3004`.
- [ ] **Step 5: Commit** `git commit -m "refactor: share driver sample data, report periods and payout wording via ops-contracts"`

### Task 2: Home dashboard

**Files:** Replace `apps/driver-mobile/app/(tabs)/index.tsx`; create `components/home/{latest-payout-card,top-areas,best-times,updates}.tsx`; retire `components/payout-hero.tsx` once nothing imports it.

- [ ] **Step 1: Build** as driver-web `components/overview/dashboard-view.tsx`: greeting with **Get help** / **Earnings**; `RangeToolbar` (7D/30D/90D/All) and the "Sample screen data" pill; `AlertStrip` for a failed/reversed payout ("Check payout details") or a missing payout destination; `HeroMetric` for screen-on time (delta, sparkline, Sample); `KpiStrip` (Ads shown, Distance, Days worked, Hours a day, all Sample); **Screen time by day** chart; **Latest payout** card (amount, status pill, Saved / Sending / Paid stage bar, `payoutDestinationLabel`, paid this year / on its way, `payoutSentence`); **Top areas** (`RankBars`); **Best times to drive** (top three slots from `bestTimes`, in words); **Updates** (newest 5 notifications, same query key as the bell). Pull-to-refresh.
- [ ] **Step 2: Verify** typecheck + lint; manual on staging: the sample numbers equal driver-web's for the same range and day; a driver with a failed payout sees the alert.
- [ ] **Step 3: Commit** `git commit -m "feat(driver-mobile): dashboard home like driver-web"`

### Task 3: Earnings

**Files:** Replace `apps/driver-mobile/app/(tabs)/earnings.tsx`; `payouts.tsx` redirects to Earnings (as web) and leaves the nav.

- [ ] **Step 1: Build** the KPI strip (paid this calendar year, on its way, last payout, paid-to destination with a change link to the payout step), **Payouts by month** (`StackedBars` from `payoutsByMonth`, paid / on its way) beside the Latest payout card, **Payout history** (`LedgerList` with All / Paid / On its way / Problems filters and counts; failed/reversed amounts struck through) and **Download CSV** (`toCsv`, `exportFileName`, shared via `Share.share({ message, title })`). Load failure: `AlertStrip` with Try again.
- [ ] **Step 2: Verify** typecheck + lint; manual: totals match driver-web Earnings; CSV shares into a notes or email app.
- [ ] **Step 3: Commit** `git commit -m "feat(driver-mobile): earnings with payouts by month, history filters and CSV"`

### Task 4: Reports

**Files:** Create `apps/driver-mobile/app/(tabs)/reports.tsx` (in the tab bar or drawer per driver-web's nav order: Home, Earnings, Reports, Routes), `components/reports/{hours-card,pay-card,day-table}.tsx`.

- [ ] **Step 1: Build** period tabs (This week / Last week / This month / Last month from `reportPeriods(nairobiDay(new Date()))`); KPI strip (logged-in, driving and screen-on hours, distance, days worked, ads shown, Sample); **Your hours** card (logged ≥ driving ≥ screen on); **Pay** card (real: settled payouts paid inside the period, and the period month's payout with status); **Day by day** list ("Off" on days with no logged hours). **Download CSV** via `Share`.
- [ ] **Step 2: Verify** typecheck + lint; manual: each period's numbers equal driver-web Reports for the same day.
- [ ] **Step 3: Commit** `git commit -m "feat(driver-mobile): weekly and monthly reports with CSV"`

### Task 5 (needs a new native build; ask first): Reports PDF

**Files:** Add `expo-print` and `expo-sharing` to `apps/driver-mobile/package.json` (Expo SDK versions via `npx expo install`); create `apps/driver-mobile/lib/report-pdf.ts` (`renderReportHtml(period, summary, days): string`, then `Print.printToFileAsync({ html })` and `Sharing.shareAsync(uri, { mimeType: "application/pdf" })`); **Save as PDF** button on Reports.

- [ ] **Step 1: Confirm with the user** that a new EAS preview build is acceptable.
- [ ] **Step 2: Implement;** the HTML mirrors the printed web report (title with period and dates, the KPIs, hours, pay, day table, "Sample" marks).
- [ ] **Step 3: Verify** with a dev build: the PDF opens from the share sheet; then `npm run build:android:preview -w driver-mobile` with `--environment preview` (see memory: ops-mobile EAS env applies to all three apps).
- [ ] **Step 4: Commit** `git commit -m "feat(driver-mobile): save reports as PDF (needs native build)"`

### Task 6: Routes rail and Settings

**Files:** Modify `apps/driver-mobile/app/(tabs)/routes.tsx` (rail ranks areas by screen-on hours for the last 7 days from `sampleTelemetry`, each row Sample-tagged, as `components/maps/driver-routes-view.tsx`); split `app/(tabs)/settings.tsx` into `settings/{index,profile,account,preferences,tour}.tsx` mirroring driver-web `components/settings/*` (profile and verification status, account and sessions, delivery preferences, tour replay).

- [ ] **Step 1: Implement both.**
- [ ] **Step 2: Verify** typecheck + lint; manual: the rail order matches driver-web Routes for the same day; each settings screen's actions work against staging.
- [ ] **Step 3: Commit** `git commit -m "feat(driver-mobile): ranked routes rail and split settings"`

### Task 7: Docs

- [ ] Update `docs/driver/DRIVER-APP.md` § Driver mobile (replace the "Home and Earnings still use the payout hero… mobile has not followed yet" paragraph with the new tab list and screens) and `DESIGN.md` (drop the "driver-mobile still uses the earlier payout hero" line). Commit `docs: driver-mobile parity`.

---

## Addendum 2026-11-16: what shipped instead of Tasks 1–3

driver-mobile did not copy driver-web's dashboard. It kept a phone-shaped structure and shows **no screen-time, distance or ads figures**, because nothing records them yet and an invented headline number is worse than none. Real payouts only on Home and Earnings:

- Home: payout hero → payout KPIs → quick actions (My routes, Payout details, Get help) → newest three Updates.
- Earnings: payout KPIs → Payouts by month (`payoutMonthBars`, `payoutTakeaway`) → history grouped by year (`groupPayoutsByYear`), failed/reversed struck through.
- New helpers live in `packages/ops-contracts/src/driver-payouts.ts` (tested); `driver-sample` / `driver-reports` were not moved.
- Shared phone pieces: `components/app/section.tsx` (`SectionHeader`, `SampleTag`, `Pill`, `Card`); uppercase eyebrows removed from Settings; `lib/design-preview.ts` fakes data in dev builds.
- Tasks 4 (Reports), 5 (PDF) and 6's settings split are not done.
