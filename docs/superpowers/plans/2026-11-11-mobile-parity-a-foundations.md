# Plan A: Shared mobile foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One theme-agnostic package of chart and dashboard primitives (`@workspace/mobile-charts`) used by ops-mobile, customer-mobile and driver-mobile, so Plans B–D build screens instead of charts.

**Architecture:** A new workspace package exporting TypeScript source (like `@workspace/ops-contracts`). Pure maths (`geometry.ts`, `delta.ts`) is unit-tested with vitest; components render with `react-native-svg` and take colours through a `ChartPalette` prop, never from an app theme. Each app maps its own theme to a palette in `lib/chart-palette.ts` and lists the package in `metro.config.js`.

**Tech Stack:** React Native 0.81 / Expo SDK 54, `react-native-svg` 15.12.1, TypeScript, vitest 4.

**Spec:** [2026-11-11-mobile-parity-overview.md](./2026-11-11-mobile-parity-overview.md)

## Global Constraints

- Everything in the overview's Global Constraints section applies.
- The package has **no** dependency on any app (`@/…`), on Expo modules, or on a theme. Peer deps only: `react`, `react-native`, `react-native-svg`. Runtime dep: `@workspace/ops-contracts` (for `Delta`, `DailyPoint`, `NamedValue`, `HeatCell`).
- Semantics mirror the web kit in `packages/ui/src/components/{charts,dashboard}`: same prop names where the concept is the same (`takeaway`, `isEmpty`, `emptyMessage`, `delta`, `good`), same rule that a `null` change renders nothing.
- Touch targets ≥ 44 pt. Every chart has an `accessibilityLabel` summarising it (the takeaway when there is one).

## Review Focus

- **All-null or all-zero series** (a new org, the "All" range with no data): charts must render the empty state, not a flat line at 0 or `NaN` in an SVG path. Pinned in Task 1 tests (`linePath` with all nulls, `niceMax(0)`, `donutArcs([0,0])`).
- **A single data point**: a line chart with one point must draw a dot, not throw on `width / (n - 1)`. Pinned in Task 1 (`linePath([5])`).
- **Negative values** (net margin, adjustments): bar and line geometry must place them below the baseline rather than clipping. Pinned in Task 1 (`barGeometry` with a negative value).
- **Long labels and large numbers** (`KES 1,234,567`, a 40-character campaign name): rows truncate with `numberOfLines={1}`, never push values off screen. Checked manually in Task 4 on a 360 dp wide screen.
- **Dark mode**: every colour comes from the palette, so a component that hardcodes `#000` breaks dark mode. Checked in Task 4 by switching theme on each app.

---

### Task 1: Package scaffold, geometry and delta logic

**Files:**
- Create: `packages/mobile-charts/package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` (copy the four from `packages/ops-contracts`, rename to `@workspace/mobile-charts`, exports `".": "./src/index.ts"`)
- Create: `packages/mobile-charts/src/geometry.ts`, `src/delta.ts`, `src/palette.ts`, `src/index.ts`
- Test: `packages/mobile-charts/src/geometry.test.ts`, `src/delta.test.ts`
- Delete: `packages/mobile-ui/` (empty leftover)

**Interfaces:**
- Produces:
  - `type ChartPalette = { text: string; muted: string; grid: string; surface: string; border: string; series: readonly string[]; good: string; bad: string; neutral: string; sample: string }`
  - `niceMax(value: number): number`: smallest of 1, 2, 2.5, 5 × 10ⁿ that is ≥ value; returns 1 for value ≤ 0
  - `linePath(values: readonly (number | null)[], width: number, height: number, min: number, max: number): string`: SVG path; a `null` breaks the line (next point starts with `M`); a lone point between nulls (or a one-point series) is drawn as a zero-length `M x,y l0,0` so a round line cap shows it as a dot
  - `barGeometry(value: number, min: number, max: number, height: number): { y: number; h: number }`: baseline is where 0 sits; negative values extend below it
  - `donutArcs(values: readonly number[], radius: number, thickness: number): { d: string; share: number; index: number }[]`: skips values ≤ 0; empty array when the total is 0
  - `deltaView(delta: Delta, good: "up" | "down" | "neutral", format?: (change: number) => string): null | { direction: "up" | "down" | "flat"; tone: "good" | "bad" | "neutral"; text: string; label: string }`: mirrors web `DeltaPill`: null when `change` is null or not finite; text `"12.3%"` by default, `"0%"` when flat; label `"Up 12.3% on the previous period"` / `"Down …"` / `"No change on the previous period"`

- [ ] **Step 1: Write the failing tests**

```ts
// geometry.test.ts
expect(niceMax(0)).toBe(1); expect(niceMax(87)).toBe(100); expect(niceMax(0.3)).toBe(0.5)
expect(niceMax(1200)).toBe(2000); expect(niceMax(2400)).toBe(2500)
expect(linePath([0, 10], 100, 50, 0, 10)).toBe("M0,50L100,0")
expect(linePath([5, null, 5, 5], 90, 50, 0, 10).match(/M/g)).toHaveLength(2)
expect(linePath([null, null], 100, 50, 0, 10)).toBe("")
expect(linePath([5], 100, 50, 0, 10)).toBe("M0,25l0,0")
expect(barGeometry(5, 0, 10, 100)).toEqual({ y: 50, h: 50 })
expect(barGeometry(-5, -10, 10, 100)).toEqual({ y: 50, h: 25 })
expect(donutArcs([0, 0], 40, 8)).toEqual([])
expect(donutArcs([1, 3], 40, 8).map((a) => a.share)).toEqual([0.25, 0.75])
// delta.test.ts
expect(deltaView({ current: 1, previous: null, change: null }, "up")).toBeNull()
expect(deltaView({ current: 2, previous: 1, change: 100 }, "up")).toMatchObject({ direction: "up", tone: "good", text: "100.0%" })
expect(deltaView({ current: 1, previous: 2, change: -50 }, "up")?.tone).toBe("bad")
expect(deltaView({ current: 2, previous: 1, change: 100 }, "neutral")?.tone).toBe("neutral")
expect(deltaView({ current: 1, previous: 1, change: 0 }, "up")).toMatchObject({ direction: "flat", text: "0%", label: "No change on the previous period" })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @workspace/mobile-charts`
Expected: FAIL, functions not defined.

- [ ] **Step 3: Implement `geometry.ts`, `delta.ts`, `palette.ts` with the signatures above; `index.ts` re-exports them**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @workspace/mobile-charts && npm run typecheck -w @workspace/mobile-charts`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-charts && git rm -r --cached packages/mobile-ui 2>/dev/null; rm -rf packages/mobile-ui
git commit -m "feat(mobile-charts): shared chart geometry and delta logic for the mobile apps"
```

### Task 2: Chart components

**Files:**
- Create in `packages/mobile-charts/src/charts/`: `trend-chart.tsx`, `sparkline.tsx`, `stacked-bars.tsx`, `donut-chart.tsx`, `rank-bars.tsx`, `heatmap.tsx`, `share-bar.tsx`
- Modify: `packages/mobile-charts/src/index.ts` (export all)

**Interfaces:**
- Consumes: Task 1 functions and `ChartPalette`.
- Produces (every component takes `palette: ChartPalette` and `accessibilityLabel?: string`; width comes from `onLayout`, height is a prop with the default shown):
  - `TrendChart({ points: DailyPoint[]; series: { key: string; label: string; previousKey?: string; format?: (v: number) => string }[]; height = 180 })`: one line per series, its previous-period twin dashed and muted; tap a day to show a value row above the chart (the mobile stand-in for the web tooltip)
  - `Sparkline({ values: (number | null)[]; height = 32; color?: string })`
  - `StackedBars({ bars: { label: string; segments: { key: string; value: number }[] }[]; keys: { key: string; label: string }[]; height = 180; format?: (v: number) => string })`: payouts by month, money in/out
  - `DonutChart({ data: NamedValue[]; size = 140; format?: (v: number) => string; centerLabel?: string })` with a legend list under it
  - `RankBars({ data: NamedValue[]; format?: (v: number) => string; max?: number })`: horizontal ranked rows, label left, value right, bar under
  - `Heatmap({ cells: HeatCell[]; rows: string[]; columns: string[]; format?: (v: number) => string })`: null cells hatched/muted, tap a cell to read its value
  - `ShareBar({ data: NamedValue[] })`: one 100 % bar split by share, legend below

- [ ] **Step 1: Implement the seven components with the props above.** Use `linePath` / `barGeometry` / `donutArcs` / `niceMax` for every coordinate (no inline maths that duplicates Task 1). Each renders nothing but its empty guard when every value is null or 0 (`ChartCard` in Task 3 shows the message).
- [ ] **Step 2: Run** `npm run typecheck -w @workspace/mobile-charts && npm run lint -w @workspace/mobile-charts`. Expected: clean.
- [ ] **Step 3: Commit** `git commit -m "feat(mobile-charts): trend, bar, donut, rank, heatmap and share charts"`

### Task 3: Dashboard primitives

**Files:**
- Create in `packages/mobile-charts/src/dashboard/`: `chart-card.tsx`, `kpi-strip.tsx`, `delta-pill.tsx`, `hero-metric.tsx`, `range-toolbar.tsx`, `segment-tabs.tsx`, `status-pill.tsx`, `alert-strip.tsx`, `ledger-list.tsx`, `progress-card.tsx`, `sample-tag.tsx`, `skeletons.tsx`
- Modify: `packages/mobile-charts/src/index.ts`
- Modify: `packages/ops-contracts/src/analytics.ts` (add `export type StatusTone = "good" | "warning" | "serious" | "neutral"`), `packages/ui/src/components/dashboard/status-pill.tsx` (import and re-export it instead of declaring it). Run `npm run typecheck -w customer-web -w ops -w driver-web` after.

**Interfaces:**
- Produces (all take `palette: ChartPalette`):
  - `ChartCard({ title: string; description?: string; takeaway?: string; action?: ReactNode; isEmpty: boolean; emptyMessage: string; children: ReactNode })`: takeaway rendered above the chart only when not empty (web rule from `packages/ui/src/components/charts/chart-card.tsx`)
  - `KpiStrip({ items: KpiItem[]; columns?: 2 | 3 })` with `type KpiItem = { label: string; value: string; note?: string; delta?: { delta: Delta; good: "up" | "down" | "neutral"; format?: (c: number) => string }; sample?: boolean }`: a delta with a non-null change shows `DeltaPill` followed by "vs last period"
  - `DeltaPill({ delta: Delta; good; format? })`: renders `deltaView`; arrow glyph plus colour, never colour alone
  - `HeroMetric({ label: string; value: string; delta?: KpiItem["delta"]; sparkline?: (number | null)[]; sample?: boolean })`
  - `RangeToolbar({ value: DateRangeKey; onChange: (r: DateRangeKey) => void; options?: readonly DateRangeKey[] })`: chips for `7d | 30d | 90d | all` labelled `7D 30D 90D All`
  - `SegmentTabs<T extends string>({ tabs: { value: T; label: string; badge?: number }[]; value: T; onChange: (v: T) => void })`: horizontally scrollable
  - `StatusPill({ label: string; tone: StatusTone })` with `StatusTone = "good" | "warning" | "serious" | "neutral"` imported from `@workspace/ops-contracts` (this task moves the type there from `packages/ui/src/components/dashboard/status-pill.tsx`, which then re-exports it so web imports keep working); text always present (status is never colour alone)
  - `AlertStrip({ tone: "bad" | "warn" | "info"; title: string; body?: string; actionLabel?: string; onAction?: () => void })`
  - `LedgerList<T>({ rows: T[]; keyOf: (r: T) => string; renderRow: (r: T) => ReactNode; filters?: { value: string; label: string; count?: number }[]; filter?: string; onFilter?: (v: string) => void; onEndReached?: () => void; emptyMessage: string })`
  - `ProgressCard({ title: string; subtitle?: string; progress: number /* 0..1 */; caption?: string; onPress?: () => void })`
  - `SampleTag()`: dashed "Sample" badge
  - `CardSkeleton`, `KpiStripSkeleton({ count })`, `ChartSkeleton({ height })`, `ListSkeleton({ rows })`

- [ ] **Step 1: Implement the primitives.** Copy wording from the web kit (`"vs last period"`, `"Sample"`).
- [ ] **Step 2: Run** `npm run typecheck -w @workspace/mobile-charts && npm run lint -w @workspace/mobile-charts`. Expected: clean.
- [ ] **Step 3: Commit** `git commit -m "feat(mobile-charts): dashboard primitives (chart card, KPI strip, toolbar, ledger, alerts)"`

### Task 4: Wire the package into the three apps

**Files:**
- Modify: `apps/{ops,customer,driver}-mobile/package.json` (add `"@workspace/mobile-charts": "*"`), `apps/*-mobile/metro.config.js` (add to `workspacePackages`, same shape as `@workspace/ops-contracts`)
- Create: `apps/{ops,customer,driver}-mobile/lib/chart-palette.ts`: `useChartPalette(): ChartPalette` built from that app's `useThemeColors()` (light and dark)
- Modify: `apps/ops-mobile/components/app/sparkline.tsx`, `apps/ops-mobile/components/app/pie-chart.tsx`: re-implement as thin wrappers over `Sparkline` / `DonutChart` keeping their current props, so ops-mobile has one chart implementation
- Modify: `docs/shared/ARCHITECTURE.md` (one line under packages: `@workspace/mobile-charts`, what it is, palette rule)

- [ ] **Step 1: Add the dependency and metro entry to each app; run `npm install` at the root.**
- [ ] **Step 2: Add `useChartPalette()` to each app.**
- [ ] **Step 3: Rewrap ops-mobile's sparkline and pie chart.**
- [ ] **Step 4: Verify.** Run `npm run typecheck -w ops-mobile -w customer-mobile -w driver-mobile` and the same with `lint`. Expected: clean. Manual: start ops-mobile against staging, open Dashboard: the activity sparkline and pie chart look as before in light and dark mode; on a 360 dp wide emulator nothing overflows.
- [ ] **Step 5: Commit** `git commit -m "chore(mobile): use @workspace/mobile-charts in all three apps"`
