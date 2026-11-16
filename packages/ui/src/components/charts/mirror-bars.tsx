"use client"

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  BAR_FILL_OPACITY,
  BAR_SIZE,
  BAR_STROKE_OPACITY,
  GRID_STROKE_OPACITY,
  KitTooltip,
  chartColor,
  defaultFormat,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Two measures that share a unit, one above zero and one below (money in, money out). One
 * y-axis. Pass both as positive numbers; `down` is mirrored here, and the tooltip shows the
 * real magnitude.
 */
export function MirrorBars({
  data,
  up,
  down,
  valueFormatter = defaultFormat,
  xKey = "period",
  className,
}: {
  data: Record<string, string | number | null>[]
  up: { key: string; label: string }
  down: { key: string; label: string }
  valueFormatter?: (value: number) => string
  xKey?: string
  className?: string
}) {
  const config: ChartConfig = {
    [up.key]: { label: up.label, color: chartColor(2) },
    [down.key]: { label: down.label, color: chartColor(0) },
  }
  const rows = data.map((row) => {
    const value = row[down.key]
    return { ...row, [down.key]: typeof value === "number" ? -Math.abs(value) : value }
  })
  // The tooltip and axis show magnitudes, not signed numbers.
  const magnitude = (value: number) => valueFormatter(Math.abs(value))

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <BarChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={GRID_STROKE_OPACITY} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={magnitude} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
          content={(props) => <KitTooltip {...props} valueFormatter={magnitude} formatLabel={String} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Bar
          dataKey={up.key}
          name={up.label}
          stackId="m"
          barSize={BAR_SIZE}
          radius={[5, 5, 0, 0]}
          fill={chartColor(2)}
          fillOpacity={BAR_FILL_OPACITY}
          stroke={chartColor(2)}
          strokeOpacity={BAR_STROKE_OPACITY}
          isAnimationActive={false}
        />
        <Bar
          dataKey={down.key}
          name={down.label}
          stackId="m"
          barSize={BAR_SIZE}
          radius={[0, 0, 5, 5]}
          fill={chartColor(0)}
          fillOpacity={BAR_FILL_OPACITY}
          stroke={chartColor(0)}
          strokeOpacity={BAR_STROKE_OPACITY}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  )
}
