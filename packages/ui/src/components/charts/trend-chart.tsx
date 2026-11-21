"use client"

import * as React from "react"
import { Area, Brush, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  GRID_STROKE_OPACITY,
  KitTooltip,
  MARK,
  WashGradients,
  axisFormatter,
  seriesValues,
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

/** Long series get a drag-to-zoom strip under the plot. */
const BRUSH_FROM_POINTS = 60
const BRUSH_START_WINDOW = 30

/**
 * Area or line over days, one y-axis. Areas are a soft wash (hue fading to the baseline), the
 * cursor is a hairline crosshair and the hovered point gets an 8px dot with a surface ring. Two
 * or more series get a legend; the tooltip is always on. Series colour defaults by position, so
 * keep the series order stable between renders. `syncId` links the crosshair across charts.
 */
export function TrendChart({
  data,
  series,
  stacked,
  valueFormatter = defaultFormat,
  xKey = "day",
  brush,
  syncId,
  className,
}: {
  data: Record<string, string | number | null>[]
  series: TrendSeries[]
  stacked?: boolean
  valueFormatter?: (value: number) => string
  xKey?: string
  /** Defaults to on at 60+ points. */
  brush?: boolean
  syncId?: string
  className?: string
}) {
  const gradientPrefix = `wash-${React.useId().replace(/:/g, "")}`
  const showBrush = brush ?? data.length >= BRUSH_FROM_POINTS
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
      <ComposedChart data={rows} syncId={syncId} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <WashGradients
          ids={series.filter((s) => !s.dashed).map((s, i) => ({ id: `${gradientPrefix}-${s.key}`, color: colorOf(s, i) }))}
        />
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={GRID_STROKE_OPACITY} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatDay}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={axisFormatter(seriesValues(data, series.map((s) => s.key)), valueFormatter)}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35, strokeWidth: 1 }}
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
              strokeWidth={MARK.line}
              strokeDasharray="6 5"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: MARK.dot, strokeWidth: MARK.ring, stroke: "var(--card)" }}
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
              strokeWidth={MARK.line}
              strokeLinecap="round"
              fill={`url(#${gradientPrefix}-${s.key})`}
              fillOpacity={1}
              dot={false}
              activeDot={{ r: MARK.dot, strokeWidth: MARK.ring, stroke: "var(--card)", fill: colorOf(s, i) }}
              isAnimationActive={false}
            />
          )
        )}
        {showBrush ? (
          <Brush
            dataKey={xKey}
            height={28}
            travellerWidth={8}
            stroke="var(--border)"
            fill="var(--chart-track)"
            tickFormatter={formatDay}
            startIndex={Math.max(0, rows.length - BRUSH_START_WINDOW)}
          />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  )
}
