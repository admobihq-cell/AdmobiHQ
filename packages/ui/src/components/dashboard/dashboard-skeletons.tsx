import type * as React from "react"

import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/*
 * Building blocks for dashboard loading states. Compose them into the grid of the real tab, using
 * the same Card, spacing and chart heights, so the page does not jump when data arrives. Titles
 * and descriptions are bars, not copy, so these never drift from the cards they stand in for.
 * Lines are padded to the real line height (title 22px, description 20px).
 */

/** Announces the wait once and hides the bars from assistive tech. */
export function SkeletonShell({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" className={cn("grid gap-4", className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="grid gap-4">
        {children}
      </div>
    </div>
  )
}

function CardHead({ action }: { action?: boolean }) {
  return (
    <CardHeader className={action ? "grid-cols-[1fr_auto]" : undefined}>
      <Skeleton className="my-[3px] h-4 w-32" />
      <Skeleton className="my-[3px] h-3.5 w-56 max-w-full" />
      {action ? <Skeleton className="col-start-2 row-span-2 row-start-1 h-7 w-16" /> : null}
    </CardHeader>
  )
}

/** The headline figure card: label, value, a delta line and a note. */
export function HeroSkeleton({ deltas = false }: { deltas?: boolean }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col gap-3">
        <div>
          <Skeleton className="my-[3px] h-3.5 w-24" />
          <Skeleton className="my-0.5 h-9 w-40 sm:h-10" />
        </div>
        {deltas ? <Skeleton className="h-5 w-44" /> : null}
        <Skeleton className="my-[2px] h-3 w-52 max-w-full" />
      </CardContent>
    </Card>
  )
}

// Same breakpoints as KpiStrip's COLUMNS; static so Tailwind sees them.
const KPI_COLUMNS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
} as const

/** One divided card of KPI cells, built like KpiStrip so the hairlines and heights line up. */
export function KpiStripSkeleton({
  cells,
  columns: columnsProp,
  className,
}: {
  cells: number
  /** Match the real strip's `columns` when it is not the default for this many cells. */
  columns?: keyof typeof KPI_COLUMNS
  className?: string
}) {
  const columns = columnsProp ?? (Math.min(5, Math.max(2, cells)) as keyof typeof KPI_COLUMNS)
  return (
    <Card className={cn("gap-0 py-0 shadow-xs", className)}>
      <div className={cn("-mr-px -mb-px grid grid-cols-1", KPI_COLUMNS[columns])}>
        {Array.from({ length: cells }, (_, i) => (
          <div key={i} className="border-r border-b p-4">
            <Skeleton className="my-[3px] h-3.5 w-24" />
            <Skeleton className="mt-2 mb-[3px] h-7 w-24" />
            <Skeleton className="mt-0.5 h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Hero card on the left, KPI strip across the other two columns, as every dashboard opens. */
export function HeroKpiSkeleton({ cells, deltas }: { cells: number; deltas?: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <HeroSkeleton deltas={deltas} />
      <KpiStripSkeleton cells={cells} className="h-full xl:col-span-2" />
    </div>
  )
}

/** Plot area of a chart card: an area-chart baseline, or ranked bars. */
export function ChartSkeleton({
  variant = "area",
  className,
  toggle = true,
}: {
  variant?: "area" | "bars" | "heatmap" | "columns" | "sankey" | "grid" | "panels"
  className?: string
  /** The chart/table switch in the card corner. */
  toggle?: boolean
}) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHead action={toggle} />
      <CardContent>
        {variant === "columns" ? (
          <ColumnsPlot className="h-64" />
        ) : variant === "sankey" ? (
          // Sources, the hub, outputs: node bars at the heights a typical cash flow lands on.
          <div className="flex h-72 items-stretch justify-between px-[18%]">
            {[[46, 20, 12], [86], [30, 26, 12, 6]].map((column, i) => (
              <div key={i} className="flex w-2.5 flex-col justify-center gap-3">
                {column.map((h, j) => (
                  <Skeleton key={j} className="w-full rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            ))}
          </div>
        ) : variant === "grid" ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-[3px] overflow-hidden">
              {Array.from({ length: 26 }, (_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }, (_, d) => (
                    <Skeleton key={d} className="size-3 rounded-[3px]" />
                  ))}
                </div>
              ))}
            </div>
            <Skeleton className="ml-auto h-3 w-28" />
          </div>
        ) : variant === "panels" ? (
          // SyncedPanels: a columns panel over a line panel, each with its small label.
          <div className="flex flex-col gap-1">
            <Skeleton className="my-[2px] h-3 w-12" />
            <ColumnsPlot className="h-40" />
            <Skeleton className="mt-2 mb-[2px] h-3 w-24" />
            <Skeleton className="h-36 rounded-md" />
          </div>
        ) : variant === "area" ? (
          <div className="flex h-64 items-end gap-1.5">
            {[38, 52, 44, 66, 58, 74, 62, 80, 70, 56, 64, 48].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : variant === "bars" ? (
          <div className="grid gap-4 py-1">
            {[92, 74, 58, 41, 26].map((w, i) => (
              <div key={i} className="grid gap-1.5">
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-10" />
                </div>
                <Skeleton className="h-2 rounded-full" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-1.5">
            {Array.from({ length: 5 }, (_, r) => (
              <div key={r} className="grid grid-cols-[6rem_repeat(4,1fr)] items-center gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                {Array.from({ length: 4 }, (_, c) => (
                  <Skeleton key={c} className="h-9 rounded-sm" />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Rounded columns on faint full-height tracks, as ColumnChart draws them. */
function ColumnsPlot({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      {[44, 58, 50, 72, 64, 80, 68, 86, 74, 60, 70, 54].map((h, i) => (
        <div key={i} className="flex h-full flex-1 items-end rounded-md bg-muted/40">
          <Skeleton className="w-full rounded-md" style={{ height: `${h}%` }} />
        </div>
      ))}
    </div>
  )
}

/** A titled card of StatList rows: icon tile, label, value, note. */
export function StatListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHead />
      <CardContent className="flex flex-col divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** A titled card holding a list: the action queue, a severity list, a breakdown. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHead />
      <CardContent className="grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Skeleton className="h-4 w-2/5 max-w-60" />
              <Skeleton className="h-3 w-3/5 max-w-80" />
            </div>
            <Skeleton className="h-7 w-16 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** A titled card with a gauge and a few label/value lines, for the one-figure cards. */
export function FigureSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHead />
      <CardContent className="grid gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** The LedgerCard table: summary tiles, filter tabs + toolbar, header row, body rows, pager. */
export function LedgerSkeleton({
  rows = 6,
  columns = 5,
  filters = false,
  summary = 0,
  tabs = 0,
  actions = 0,
  search = false,
}: {
  rows?: number
  columns?: number
  filters?: boolean
  /** MetricTiles above the table, as LedgerCard's `summary`. */
  summary?: number
  /** Filter-tab pills, as LedgerCard's `filterTabs`. */
  tabs?: number
  /** Toolbar buttons on the right of the tabs row. */
  actions?: number
  /** A search field before those buttons. */
  search?: boolean
}) {
  return (
    <Card className="shadow-xs">
      <CardHead />
      <CardContent className="flex flex-col gap-4">
        {summary > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: summary }, (_, i) => (
              <div key={i} className="rounded-md border bg-muted/35 px-3 py-2.5">
                <Skeleton className="my-[2px] h-3 w-20" />
                <Skeleton className="my-1 h-5 w-28" />
                <Skeleton className="my-[2px] h-3 w-24" />
              </div>
            ))}
          </div>
        ) : null}
        {tabs > 0 || actions > 0 || search ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {tabs > 0 ? (
              <div className="flex h-9 w-fit max-w-full items-center gap-1 overflow-hidden rounded-lg bg-muted p-[3px]">
                {Array.from({ length: tabs }, (_, i) => (
                  <Skeleton key={i} className="h-full w-20 shrink-0 rounded-md bg-background/70" />
                ))}
              </div>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {search ? <Skeleton className="h-8 w-56 rounded-md" /> : null}
              {Array.from({ length: actions }, (_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md" />
              ))}
            </div>
          </div>
        ) : null}
        {filters ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-md border">
          <div className="flex gap-4 border-b bg-muted/40 px-3 py-2.5">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className="h-3 flex-1 max-sm:nth-[n+4]:hidden" />
            ))}
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-4 border-b px-3 py-3 last:border-b-0">
              {Array.from({ length: columns }, (_, c) => (
                <Skeleton
                  key={c}
                  className="h-4 max-sm:nth-[n+4]:hidden"
                  // Vary widths a little so the rows read as text, not a barcode.
                  style={{ flex: c === 0 ? 1.6 : 1, maxWidth: `${100 - ((r * 7 + c * 13) % 30)}%` }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-7 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * The toolbar row before the real one mounts: tab pills on the left, the date range (and any
 * extra controls, such as filters or export) on the right, on one line like DashboardToolbar.
 */
export function ToolbarSkeleton({
  tabs = 0,
  range = true,
  extras = 0,
}: {
  tabs?: number
  range?: boolean
  /** Buttons beside the range: a measurement badge, export. */
  extras?: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2" aria-hidden>
      {tabs > 0 ? (
        <div className="flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
          {Array.from({ length: tabs }, (_, i) => (
            <Skeleton key={i} className="h-full w-20 rounded-md bg-background/70" />
          ))}
        </div>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {Array.from({ length: extras }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
        {range ? <Skeleton className="h-8 w-[10.5rem] rounded-lg" /> : null}
      </div>
    </div>
  )
}
