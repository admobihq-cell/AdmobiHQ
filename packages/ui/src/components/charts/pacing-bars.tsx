"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@workspace/ui/components/chart"
import {
  BAR_SIZE,
  DIM_TRANSITION,
  MARK,
  dataEndRadius,
  useActiveMark,
  GRID_STROKE_OPACITY,
  KitTooltip,
  chartColor,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

const percent = (value: number) => `${Math.round(value)}%`

/**
 * Delivery against schedule. One axis, "% of schedule", with a dashed target line at 100%.
 * Over-delivery is not counted upstream, so a bar above the line is a schedule that ran long.
 */
export function PacingBars({
  data,
  target = 100,
  className,
}: {
  data: { period: string; percent: number | null }[]
  target?: number
  className?: string
}) {
  const config: ChartConfig = { percent: { label: "Delivered", color: chartColor(0) } }
  const top = Math.max(target, ...data.map((d) => d.percent ?? 0))
  const { set, opacityOf } = useActiveMark()

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        onMouseMove={(state) => {
          const index = state?.activeTooltipIndex
          set(index === undefined || index === null ? null : Number(index))
        }}
        onMouseLeave={() => set(null)}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={GRID_STROKE_OPACITY} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          domain={[0, Math.ceil((top * 1.15) / 10) * 10]}
          tickFormatter={percent}
        />
        <ChartTooltip
          cursor={{ fill: "var(--chart-cursor)", radius: MARK.radius }}
          content={(props) => (
            <KitTooltip {...props} valueFormatter={percent} formatLabel={String} />
          )}
        />
        <ReferenceLine
          y={target}
          stroke="var(--muted-foreground)"
          strokeWidth={2}
          strokeDasharray="6 5"
          label={{ value: `Target ${target}%`, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Bar
          dataKey="percent"
          name="Delivered"
          barSize={BAR_SIZE}
          radius={dataEndRadius("vertical")}
          fill={chartColor(0)}
          background={{ fill: "var(--chart-track)", radius: MARK.radius }}
          isAnimationActive={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fillOpacity={opacityOf(i)} style={DIM_TRANSITION} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
