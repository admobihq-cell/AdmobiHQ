"use client"

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  AREA_FILL_OPACITY,
  GRID_STROKE_OPACITY,
  KitTooltip,
  chartColor,
  defaultFormat,
  formatDay,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

export type TrendSeries = {
  key: string
  label: string
  color?: string
  /** A dashed series is drawn as a line only: use it for the previous period. */
  dashed?: boolean
  /** Data keys holding the low and high estimate; drawn as a faint band behind the line. */
  band?: [low: string, high: string]
}

/**
 * Area or line over days, one y-axis. Two or more series get a legend; the tooltip is always
 * on. Series colour defaults by position, so keep the series order stable between renders.
 */
export function TrendChart({
  data,
  series,
  stacked,
  valueFormatter = defaultFormat,
  xKey = "day",
  className,
}: {
  data: Record<string, string | number | null>[]
  series: TrendSeries[]
  stacked?: boolean
  valueFormatter?: (value: number) => string
  xKey?: string
  className?: string
}) {
  const colorOf = (s: TrendSeries, index: number) => s.color ?? chartColor(index)
  const config: ChartConfig = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: colorOf(s, i) }])
  )

  const rows = data.map((row) => {
    const next: Record<string, unknown> = { ...row }
    for (const s of series) {
      if (!s.band) continue
      const low = row[s.band[0]]
      const high = row[s.band[1]]
      next[`${s.key}__band`] = typeof low === "number" && typeof high === "number" ? [low, high] : null
    }
    return next
  })

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={GRID_STROKE_OPACITY} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatDay}
        />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={valueFormatter} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={(props) => <KitTooltip {...props} valueFormatter={valueFormatter} />}
        />
        {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {series.map((s, i) =>
          s.band ? (
            <Area
              key={`${s.key}-band`}
              dataKey={`${s.key}__band`}
              name={`${s.label} range`}
              stroke="none"
              fill={colorOf(s, i)}
              fillOpacity={0.12}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
            />
          ) : null
        )}
        {series.map((s, i) =>
          s.dashed ? (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              strokeDasharray="6 5"
              dot={false}
              isAnimationActive={false}
            />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "stack" : undefined}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              fill={colorOf(s, i)}
              fillOpacity={AREA_FILL_OPACITY}
              dot={false}
              isAnimationActive={false}
            />
          )
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
