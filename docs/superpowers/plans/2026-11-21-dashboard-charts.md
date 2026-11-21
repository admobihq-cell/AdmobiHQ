# Dashboard Charts (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every dashboard in ops, customer-web and driver-web gets the BoardUI look and feel: rounded marks, soft gradient washes, a hover that lifts one mark and dims the rest, and count-up figures. The dashboards also gain the Recharts forms our data supports: cash-flow Sankeys, synced spend/cost panels, an activity grid, a ribbon funnel and a drag-to-zoom strip.

**Architecture:** Most of the change lands in the shared kit (`packages/ui/src/components/charts/*` and `dashboard/*`), so all 19 chart screens pick it up without per-page work. New forms are new kit components. Their data shaping lives in pure, tested builders in `@workspace/ops-contracts`. Only one API field is added; everything else reuses data the dashboards already load.

**Tech Stack:** Recharts 3.8 (Sankey, ComposedChart, Brush, Bar `background`), React 19, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-search-realtime-charts-design.md` (section "4. Charts").

## Decided while planning (the dataviz method overrides the spec table)

- **The "bars + line on two axes" chart becomes `SyncedPanels`:** spend columns on top and the cost-per-1,000 line below, on a shared day axis with one synced crosshair. Dual axes are the method's number one misreading; the stacked pair shows the same relationship honestly.
- **No radial gauges:** a single ratio against a limit is a meter (`SegmentGauge` and `ProgressCard` already do this). **No treemap:** comparing many parts is ranked bars on one baseline (`RankBars` already does this).
- **No per-card Weekly/Monthly/Yearly switch:** every dashboard already has one range control in `DashboardToolbar`, and a second competing range per card is an anti-pattern (filters live in one row above the charts).
- **Palette unchanged.** The current 5 chart tokens pass every validator check in both modes:
  - Light: worst adjacent CVD ΔE 10.4, normal-vision 16.2, all ≥ 3:1 contrast on `#fffcf8`.
  - Dark: CVD 10.9, normal 16.3, on `#171b27`.
  - BoardUI's lime is not adopted; the look comes from marks, motion and hover, not hue.
- **The stacked-area "support by channel" view is dropped:** the dashboard DTO has no channel split, and adding one is a new query nobody asked for.

## Global Constraints

- Branch `feat/search-live-charts`; stage by path; never stage `apps/*/android/**`; no AI trailers.
- Mark specs:
  - Bars and columns are ≤ 24 px thick, with a 4 px rounded data-end, square at the baseline.
  - Lines are 2 px with round caps. Markers are ≥ 8 px with a 2 px surface ring.
  - Area washes run from the series hue at 18% at the top to 0% at the baseline (≈10% average).
  - Gridlines are 1 px solid, recessive. Adjacent touching fills get a 2 px surface gap. Text never wears the series colour.
- Hover:
  - Line and area charts get a crosshair plus a tooltip.
  - Bar, dot and cell marks get a per-mark tooltip. The active mark keeps full opacity and the others drop to 0.35, with a 120 ms opacity transition.
  - Hit targets are larger than the mark. Keyboard focus mirrors hover.
- Motion: count-ups and transitions are disabled under `prefers-reduced-motion`. No Recharts entry animations (`isAnimationActive={false}`, as today).
- Every chart keeps `ChartCard`'s `isEmpty` / `emptyMessage` and its `table` view. Legends appear for ≥ 2 series only. Light and dark are both checked.
- Vitest runs from `C:/Users/...` with an uppercase drive letter. Run `graphify update .` after code changes. Update `DESIGN.md` (charts line) and `docs/` in the same change.

## Review Focus

1. **Negative or zero net margin in the finance Sankey:** Sankey links can't be negative, so the builder must balance with a "Shortfall" source and never emit a link ≤ 0. Test in Task 4.
2. **Spend-by-campaign and spend-by-category totals differ** (rounding, folded "Other", tax): the customer Sankey must still balance, using an "Unallocated" node. Test in Task 4.
3. **A sparse daily series for the activity grid** (days with no rows, a range starting mid-week, ranges longer than 53 weeks): the grid stays aligned Monday to Sunday and missing days are null, not 0. Test in Task 6.
4. **A single data point or an all-zero series:** the gradient, track and brush must not divide by zero or show the brush. Covered by the Task 2 rule (brush only at ≥ 60 points) and checked by hand in Task 8.
5. **Hover dimming must never hide a value** from keyboard or screen-reader users: the table view and the focus path stay complete. Checked by hand in Task 8.

---

### Task 1: Kit tokens and shared mark helpers

**Files:**
- Modify: `packages/ui/src/styles/globals.css`: add `--chart-track` (light `oklch(0.94 0.006 82)`, dark `oklch(0.29 0.02 268)`) and `--chart-cursor` (light `oklch(0.9 0.008 82 / 0.6)`, dark `oklch(0.35 0.02 268 / 0.6)`), plus the matching `@theme inline` colour aliases.
- Modify: `packages/ui/src/components/charts/shared.tsx`

**Interfaces — Produces** (in `shared.tsx`):

```ts
export const MARK = { barMax: 24, radius: 4, line: 2, dot: 4, ring: 2, dim: 0.35, washTop: 0.18 } as const
/** Rounded data-end, square baseline, for vertical (columns) or horizontal (bars) Recharts <Bar radius>. */
export function dataEndRadius(orientation: "vertical" | "horizontal", negative?: boolean): [number, number, number, number]
/** <defs> with one vertical gradient per series id: hue at MARK.washTop → 0. */
export function WashGradients({ ids }: { ids: { id: string; color: string }[] }): JSX.Element
/** Hover state for bar/cell charts: which index is active; opacity for any index. */
export function useActiveMark(): { active: number | null; set: (i: number | null) => void; opacityOf: (i: number) => number }
```

  `BAR_FILL_OPACITY`, `BAR_STROKE_OPACITY` and `AREA_FILL_OPACITY` stay exported (callers use them) but are re-pointed: bars become solid fills at opacity 1, and the area constant is unused by the new gradient.

- [ ] **Step 1:** Implement. `dataEndRadius("vertical")` returns `[4,4,0,0]`, `("vertical", true)` returns `[0,0,4,4]`, `("horizontal")` returns `[0,4,4,0]`.
- [ ] **Step 2:** Run `npx tsc --noEmit` and `npx eslint src/components/charts src/styles` in `packages/ui`. Expect clean.
- [ ] **Step 3:** Commit `feat(ui): chart track/cursor tokens and shared mark helpers`.

---

### Task 2: TrendChart and a new ColumnChart

**Files:**
- Modify: `packages/ui/src/components/charts/trend-chart.tsx`
- Create: `packages/ui/src/components/charts/column-chart.tsx`

**Interfaces:**
- `TrendChart` keeps its props and adds `brush?: boolean` (default: on when `data.length >= 60`) and `syncId?: string`. Areas fill from `url(#wash-<key>)` via `WashGradients`. The cursor is a 1 px vertical line in `--border`. `activeDot` is r = 4 with a 2 px `var(--card)` ring. The dashed series stays a line. The brush is a 28 px strip under the plot (`<Brush height={28} travellerWidth={8} stroke="var(--border)" fill="var(--chart-track)" />`) that starts on the last 30 points.
- Produces `ColumnChart`:

```ts
export function ColumnChart(props: {
  data: Record<string, string | number | null>[]
  series: { key: string; label: string; color?: string }[]   // 1 series, or stacked when > 1
  xKey?: string                                               // default "day"
  valueFormatter?: (v: number) => string
  syncId?: string
  className?: string
}): JSX.Element
```

  It draws rounded columns (`MARK.barMax`, `dataEndRadius`) with a full-height `--chart-track` background behind each slot (Recharts `<Bar background={{ fill: "var(--chart-track)", radius: 4 }}>`; for stacked charts, only the bottom series draws the track). Hovering a column dims the others through `useActiveMark`. The cursor is a `--chart-cursor` band. It uses `KitTooltip` and shows a legend at ≥ 2 series.

- [ ] **Step 1:** Implement both.
- [ ] **Step 2:** Run `tsc` and `eslint` on `packages/ui`. Expect clean.
- [ ] **Step 3:** Commit `feat(ui): gradient trend chart with brush, rounded column chart with tracks`.

---

### Task 3: Restyle bar-like kit pieces, funnel, donut, figures

**Files:**
- Modify: `packages/ui/src/components/charts/{rank-bars,mirror-bars,pacing-bars,tick-bar,share-bar,funnel-bars,donut-chart,heatmap}.tsx`, `packages/ui/src/components/dashboard/{hero-metric,kpi-strip,metric-tile}.tsx`

**Interfaces — Produces** (props unchanged everywhere, so no caller edits):
- `RankBars`: the hatch track becomes a solid `--chart-track` with rounded ends. Hovering or focusing a row dims the other rows' bars (`useActiveMark`). The hatch stays only for estimate values (no current prop, so it simply goes).
- `MirrorBars`: up and down bars use `dataEndRadius` (the down bar uses the negative radius), are capped at 24 px, and dim others on hover. The axis/grid stays recessive.
- `PacingBars`, `TickBar`, `ShareBar`: rounded data-ends, a 2 px surface gap between adjacent segments, and dim-others on hover.
- `FunnelBars` → ribbon look: each stage is a rounded horizontal bar on a track, joined to the next by a trapezoid ribbon (SVG path, `--chart-1` at 0.12 opacity) whose height is the next stage's share. The stage's percent of the first stage sits in a pill at the bar start. One hue (slot 1), because the stages are ordered.
- `DonutChart`: the hovered slice moves 3 px outward (`activeShape` with `outerRadius + 3`), other slices go to 0.35, and the centre label switches to the hovered slice's name and value.
- `Heatmap`: cells get a 2 px surface gap and 4 px radius, and the hovered cell gets a 2 px `--foreground` ring at 0.6.
- `HeroMetric`, `KpiStrip`, `MetricTile`: the numeric part of `value` counts up over 600 ms via the existing `useAnimatedNumber` hook. It only runs when `value` is a string that parses to a number with an optional prefix or suffix ("KES 18,420", "38%"), and is skipped under reduced motion. Cards get `transition-shadow hover:shadow-sm`.

- [ ] **Step 1:** Implement in the order listed, checking `tsc` after each file.
- [ ] **Step 2:** Run `tsc` and `eslint` on `packages/ui`, then `npm run typecheck` (all apps compile against the unchanged props). Expect clean.
- [ ] **Step 3:** Commit `feat(ui): BoardUI-style marks, hover dimming, ribbon funnel and count-up figures`.

---

### Task 4: Sankey component and the two cash-flow builders

**Files:**
- Create: `packages/ops-contracts/src/flows.ts`, `packages/ops-contracts/src/flows.test.ts` (and export them from `index.ts`)
- Create: `packages/ui/src/components/charts/sankey-chart.tsx`

**Interfaces — Produces:**

```ts
// flows.ts
export type FlowGraph = { nodes: { name: string; column: number }[]; links: { source: number; target: number; value: number }[] }
/** Ops: revenue categories → Revenue → Driver payouts / Paystack fees / Tool costs / Net margin.
 *  A loss adds a "Shortfall" source into the cost side so both sides balance; never a link <= 0. */
export function financeFlow(input: { revenueByCategory: NamedValue[]; payoutsKes: number; feesKes: number; toolCostsKes: number }): FlowGraph
/** Advertiser: spend by campaign → Spend → spend by category. Mismatched totals add an "Unallocated" node on the short side. */
export function spendFlow(input: { byCampaign: NamedValue[]; byCategory: NamedValue[] }): FlowGraph
// sankey-chart.tsx
export function SankeyChart(props: { graph: FlowGraph; valueFormatter?: (v: number) => string; className?: string }): JSX.Element
```

  `SankeyChart` uses Recharts `<Sankey>`:
  - **Nodes:** 10 px wide, 4 px radius, coloured by column (sources `chartColor(index)` by stable order, the hub `--muted-foreground`, outputs `chartColor` by output index; "Net margin" always `--chart-3`, "Shortfall" always the status warning token).
  - **Links:** source hue at 0.28, and on hover the active link goes to 0.5 while the others drop to 0.12.
  - **Labels:** node labels outside the node in text tokens, with name and value, plus a share % on the output side.
  - **Interaction:** a `KitTooltip`-styled tooltip on links and nodes. The `table` fallback is supplied by callers.

- [ ] **Step 1: Write failing tests:**
  - `financeFlow` with revenue 100 (two categories 60/40) and costs 30/5/10 gives links summing to 100 into the hub and 100 out; margin 55.
  - With costs 90/20/10 against revenue 100, it gives a "Shortfall" node with value 20, margin absent, and no link ≤ 0.
  - With zero revenue and zero costs, it gives `{ nodes: [], links: [] }`.
  - `spendFlow` with campaigns 70+30 and categories 60+35 gives an "Unallocated" output of 5 and balances.
- [ ] **Step 2:** Run `npx vitest run src/flows.test.ts` in `packages/ops-contracts`. Expect FAIL.
- [ ] **Step 3:** Implement the builders and `SankeyChart`.
- [ ] **Step 4:** The tests pass; `tsc` and `eslint` are clean.
- [ ] **Step 5:** Commit `feat: cash-flow Sankey and flow builders`.

---

### Task 5: Daily spend in the spend report, and SyncedPanels

**Files:**
- Modify: `packages/ops-contracts/src/analytics.ts` (doc comment only: `costPerThousandTrend` points carry `cost` and `spend`), `apps/api/lib/analytics/report-queries.ts:660` (add `spend: sees ? roundTo(spendDays.get(day) ?? 0) : null`)
- Test: extend the existing report-queries spend test (locate it with `grep -rln "costPerThousandTrend" apps/api --include=*.test.ts`; if none exists, add `apps/api/lib/analytics/report-spend.test.ts` following the closest report test)
- Create: `packages/ui/src/components/charts/synced-panels.tsx`

**Interfaces:**
- Produces `SyncedPanels({ data, top, bottom, xKey?, className? })`. `top` and `bottom` are each `{ kind: "column" | "trend"; series; valueFormatter; label; heightClass? }`. It renders a `ColumnChart` (top) and a `TrendChart` (bottom) with the same `syncId` (`useId`), so the crosshair and tooltip move together. Each panel has its own y-axis and a small label at the top-left in muted text. The x-axis ticks show only on the bottom panel.
- [ ] **Step 1: Write the failing test:** the spend report's `costPerThousandTrend[i].spend` equals that day's ex-tax spend for a seeded campaign, and is `null` for a caller without spend visibility.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement the field and `SyncedPanels`.
- [ ] **Step 4:** The test passes; `tsc` is clean in api and ui.
- [ ] **Step 5:** Commit `feat: daily spend in the spend report and synced spend/cost panels`.

---

### Task 6: Activity grid

**Files:**
- Create: `packages/ops-contracts/src/week-grid.ts`, `packages/ops-contracts/src/week-grid.test.ts` (export them)
- Create: `packages/ui/src/components/charts/activity-grid.tsx`

**Interfaces — Produces:**

```ts
/** Daily points → Monday-first weeks. Missing days are null; weeks capped to the last 53. */
export function toWeekGrid(points: DailyPoint[], key: string): { weeks: { start: string; days: (number | null)[] }[]; max: number }
export function ActivityGrid(props: { points: DailyPoint[]; valueKey: string; valueFormatter?: (v: number) => string; label: string }): JSX.Element
```

  `ActivityGrid` draws a contributions-style grid: columns are weeks, rows are Mon–Sun (with Mon/Wed/Fri labels), and cells are 12 px with a 3 px gap and 3 px radius. The colour is sequential: one hue (`--chart-2`) stepped by `color-mix` across 5 levels from `--chart-track` up, with null shown as an empty outline. Each cell has a hover/focus tooltip ("Tue 4 Nov · 6.5 h"), and the legend reads Less ▢▢▢▢▢ More.

- [ ] **Step 1: Write failing tests:**
  - A range starting Wednesday puts the first value at index 2 of week 0, with Mon and Tue null.
  - A missing day in the middle is null.
  - 400 days gives 53 weeks.
  - `max` ignores nulls.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Expect PASS; `tsc` is clean.
- [ ] **Step 5:** Commit `feat: activity grid and week-grid builder`.

---

### Task 7: Place the new forms on the dashboards

**Files and placements** (each keeps a `ChartCard` with `table` and `takeaway` where honest):

| Screen | Change |
|---|---|
| `apps/ops/components/finances/overview-tab.tsx` | A full-width "Where revenue went" card with `SankeyChart graph={financeFlow(...)}`, above "Money in vs out". Table: one row per link. Takeaway: "KES X of every 100 earned was kept as margin" (or "Costs ran KES X over revenue" on a shortfall). |
| `apps/customer-web/components/billing/billing-overview-tab.tsx` | A "Where your money went" card with `SankeyChart graph={spendFlow({ byCampaign: summary.spendByCampaign, byCategory: summary.spendByCategory })}`, replacing nothing. |
| `apps/customer-web/components/reports/spend-tab.tsx` | The "Cost per 1,000" card becomes "Spend and cost per 1,000" with `SyncedPanels`: top column = `spend` (formatKes), bottom trend = `cost`. The existing takeaway is kept, and the table gains a Spend column. |
| `apps/driver-web/components/overview/dashboard-view.tsx` | A "Days on the road" card with `ActivityGrid points={trend} valueKey="hours"` beside the hours trend. Takeaway: "You drove N of the last M days". |
| `apps/ops/components/dashboards/support-dashboard.tsx` | A "When cases come in" card with `ActivityGrid points={data.casesTrend} valueKey="opened"`. |
| `apps/driver-web/components/overview/earnings-view.tsx` and `apps/ops/components/dashboards/fleet-dashboard.tsx` (monthly payouts) | The monthly `TrendChart xKey="period"` becomes `ColumnChart`, because per-month magnitudes are columns, not a continuous trend. |

- [ ] **Step 1:** Implement the placements.
- [ ] **Step 2:** Run `npm run typecheck` and lint on ops, customer-web and driver-web. Expect clean, apart from known pre-existing warnings.
- [ ] **Step 3:** Commit `feat: Sankey, synced panels, activity grids and column charts on the dashboards`.

---

### Task 8: Visual check, docs

**Files:** `DESIGN.md` (charts paragraph: the mark specs, hover dimming, the forms we use and the ones we don't, with reasons), `docs/ops/OPS-ADMIN.md` and `docs/customer/APP.md` and `docs/driver/DRIVER-APP.md` (one line each per new card).

- [ ] **Step 1:** There's no signed-in browser here, so render each new kit component in a throwaway page under `.superpowers/spike/charts/` that imports the kit with fixture data (including the Review Focus 1–4 edge cases). Screenshot light and dark with the repo's existing Playwright (`npx playwright screenshot`) and look at every shot for label collisions, clipping and overflow. Fix what you see.
- [ ] **Step 2:** Write the docs.
- [ ] **Step 3:** Run `npm test -w @workspace/ops-contracts -w api` (expect PASS) and `graphify update .`.
- [ ] **Step 4:** Commit `docs: dashboard chart system`.
