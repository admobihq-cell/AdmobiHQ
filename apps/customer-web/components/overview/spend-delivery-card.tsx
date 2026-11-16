"use client"

import { useState } from "react"
import type { DailyPoint } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { DashboardTabs } from "@workspace/ui/components/dashboard/dashboard-tabs"

export type TrendSource = {
  /** Which series. A tab only shows when its permission is held. */
  key: "spend" | "impressions" | "plays"
  label: string
  current: DailyPoint[]
  previous: DailyPoint[] | undefined
  /** The field on each point holding the value. */
  field: string
  format: (value: number) => string
  empty: string
}

/** Lines the previous period up under the current one by day index, so the dashed line overlays it. */
function overlay(source: TrendSource): DailyPoint[] {
  return source.current.map((point, i) => ({
    day: point.day,
    value: typeof point[source.field] === "number" ? (point[source.field] as number) : null,
    previous:
      typeof source.previous?.[i]?.[source.field] === "number" ? (source.previous![i]![source.field] as number) : null,
  }))
}

/** One chart, tabs for Spend, Impressions and Plays, the previous period dashed beneath. */
export function SpendDeliveryCard({ sources }: { sources: TrendSource[] }) {
  const [tab, setTab] = useState(sources[0]?.key ?? "spend")
  const source = sources.find((s) => s.key === tab) ?? sources[0]
  if (!source) return null

  const data = overlay(source)
  const hasPrevious = data.some((p) => p.previous !== null)
  const isEmpty = !data.some((p) => typeof p.value === "number" && p.value > 0)

  return (
    <ChartCard
      title="Spend and delivery"
      description="Day by day in the selected period, compared with the period before"
      isEmpty={isEmpty}
      emptyMessage={source.empty}
      action={<DashboardTabs tabs={sources.map((s) => ({ value: s.key, label: s.label }))} value={source.key} onChange={(v) => setTab(v as typeof tab)} />}
      table={{
        columns: ["Day", source.label, ...(hasPrevious ? ["Previous period"] : [])],
        rows: data.map((p) => [p.day, p.value as number | null, ...(hasPrevious ? [p.previous as number | null] : [])]),
      }}
    >
      <TrendChart
        data={data}
        series={[
          { key: "value", label: source.label },
          ...(hasPrevious ? [{ key: "previous", label: "Previous period", dashed: true, color: "var(--muted-foreground)" }] : []),
        ]}
        valueFormatter={source.format}
      />
    </ChartCard>
  )
}
