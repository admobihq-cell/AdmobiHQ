"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  DIM_TRANSITION,
  GRID_STROKE_OPACITY,
  KitTooltip,
  MARK,
  chartColor,
  dataEndRadius,
  defaultFormat,
  formatDay,
  useActiveMark,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

export type ColumnSeries = { key: string; label: string; color?: string }

/**
 * Magnitude per period as rounded columns on a faint full-height track (the empty slot reads as
 * "out of the tallest"). Hovering a column dims the others. More than one series stacks, with a
 * 2px surface gap between segments and the data-end rounded on the top segment only.
 */
export function ColumnChart({
  data,
  series,
  xKey = "day",
  valueFormatter = defaultFormat,
  syncId,
  className,
}: {
  data: Record<string, string | number | null>[]
  series: ColumnSeries[]
  xKey?: string
  valueFormatter?: (value: number) => string
  syncId?: string
  className?: string
}) {
  const { set, opacityOf } = useActiveMark()
  const colorOf = (s: ColumnSeries, index: number) => s.color ?? chartColor(index)
  const config: ChartConfig = Object.fromEntries(series.map((s, i) => [s.key, { label: s.label, color: colorOf(s, i) }]))
  const stacked = series.length > 1

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <BarChart
        data={data}
        syncId={syncId}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barCategoryGap="28%"
        onMouseMove={(state) => {
          const index = state?.activeTooltipIndex
          set(index === undefined || index === null ? null : Number(index))
        }}
        onMouseLeave={() => set(null)}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={GRID_STROKE_OPACITY} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatDay} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={valueFormatter} />
        <ChartTooltip
          cursor={{ fill: "var(--chart-cursor)", radius: MARK.radius }}
          content={(props) => <KitTooltip {...props} valueFormatter={valueFormatter} />}
        />
        {stacked ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {series.map((s, si) => {
          const isTop = si === series.length - 1
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "stack" : undefined}
              fill={colorOf(s, si)}
              maxBarSize={MARK.barMax}
              radius={isTop ? dataEndRadius("vertical") : 0}
              // Only the bottom series draws the empty-slot track, so a stack has one.
              background={si === 0 ? { fill: "var(--chart-track)", radius: MARK.radius } : undefined}
              stroke={stacked ? "var(--card)" : undefined}
              strokeWidth={stacked ? 2 : 0}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fillOpacity={opacityOf(i)} style={DIM_TRANSITION} />
              ))}
            </Bar>
          )
        })}
      </BarChart>
    </ChartContainer>
  )
}
