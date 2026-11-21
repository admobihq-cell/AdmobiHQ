"use client"

import * as React from "react"

import { ColumnChart, type ColumnSeries } from "@workspace/ui/components/charts/column-chart"
import { TrendChart, type TrendSeries } from "@workspace/ui/components/charts/trend-chart"
import { cn } from "@workspace/ui/lib/utils"

type Panel =
  | { kind: "column"; label: string; series: ColumnSeries[]; valueFormatter?: (v: number) => string; heightClass?: string }
  | { kind: "trend"; label: string; series: TrendSeries[]; valueFormatter?: (v: number) => string; heightClass?: string }

/**
 * Two measures of different scale over the same days (spend in KES, cost per 1,000) as two
 * stacked panels on one shared day axis, each with its own y-axis, and one crosshair and tooltip
 * moving across both. This is the honest form of a "bars + line, two y-axes" chart: two scales
 * on one plot invite comparisons the data doesn't support.
 */
export function SyncedPanels({
  data,
  top,
  bottom,
  xKey = "day",
  className,
}: {
  data: Record<string, string | number | null>[]
  top: Panel
  bottom: Panel
  xKey?: string
  className?: string
}) {
  const syncId = `panels-${React.useId().replace(/:/g, "")}`

  const render = (panel: Panel, isTop: boolean) => {
    const height = panel.heightClass ?? (isTop ? "h-40" : "h-36")
    // Day labels only under the bottom panel: one shared axis.
    const axisless = isTop ? "[&_.recharts-xAxis]:hidden" : ""
    return panel.kind === "column" ? (
      <ColumnChart data={data} series={panel.series} xKey={xKey} valueFormatter={panel.valueFormatter} syncId={syncId} className={cn(height, axisless)} />
    ) : (
      <TrendChart data={data} series={panel.series} xKey={xKey} valueFormatter={panel.valueFormatter} syncId={syncId} brush={false} className={cn(height, axisless)} />
    )
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="text-xs text-muted-foreground">{top.label}</p>
      {render(top, true)}
      <p className="pt-2 text-xs text-muted-foreground">{bottom.label}</p>
      {render(bottom, false)}
    </div>
  )
}
