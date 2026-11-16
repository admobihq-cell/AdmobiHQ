"use client"

import { Area, AreaChart, XAxis } from "recharts"

import { ChartContainer, ChartTooltip } from "@workspace/ui/components/chart"
import {
  AREA_FILL_OPACITY,
  KitTooltip,
  chartColor,
} from "@workspace/ui/components/charts/shared"

/** A tiny trend with no axes. Rows carry `day` (YYYY-MM-DD) and the plotted key. */
export function Sparkline({
  data,
  dataKey,
  label = "Value",
  valueFormatter,
}: {
  data: Record<string, string | number | null>[]
  dataKey: string
  label?: string
  valueFormatter?: (value: number) => string
}) {
  return (
    <ChartContainer
      config={{ [dataKey]: { label, color: chartColor(0) } }}
      className="aspect-auto h-10 w-full rounded-md border"
    >
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="day" hide />
        <ChartTooltip
          cursor={false}
          content={(props) => <KitTooltip {...props} valueFormatter={valueFormatter} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={label}
          stroke={chartColor(0)}
          strokeWidth={2}
          fill={chartColor(0)}
          fillOpacity={AREA_FILL_OPACITY}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
