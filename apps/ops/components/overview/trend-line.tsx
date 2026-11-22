"use client"

import { useId } from "react"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import { formatKes } from "@workspace/ops-contracts"

import { ChartContainer, ChartTooltip } from "@workspace/ui/components/chart"
import { KitTooltip, MARK, WashGradients } from "@workspace/ui/components/charts/shared"

/** Bullish when the period is ahead of the last one, bearish when behind; flat reads as brand. */
const TONE_COLOR = {
  // Tailwind green-400 as a literal (the banner is dark): v4 only emits theme vars a class uses.
  up: "oklch(0.792 0.209 151.711)",
  down: "var(--destructive)",
  flat: "var(--primary)",
} as const

/**
 * The banner's running total of KES booked across the period, coloured by how the period
 * compares with the one before. Hover shows the running total on that day.
 */
export function TrendLine({
  data,
  direction,
}: {
  data: Array<{ day: string; value: number }>
  direction: keyof typeof TONE_COLOR
}) {
  const id = useId().replace(/:/g, "")
  // Recharts only draws after it measures on the client, so reading the media query here is safe.
  const animate =
    typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const rows = data.reduce<Array<{ day: string; total: number }>>((acc, d) => {
    acc.push({ day: d.day, total: (acc.at(-1)?.total ?? 0) + d.value })
    return acc
  }, [])
  const color = TONE_COLOR[direction]

  return (
    <ChartContainer
      config={{ total: { label: "Booked so far", color } }}
      className="aspect-auto h-full w-full [&_.recharts-surface]:overflow-visible"
    >
      <AreaChart data={rows} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
        <WashGradients ids={[{ id: `wash-${id}`, color }]} />
        <XAxis dataKey="day" hide />
        <YAxis hide domain={[0, "dataMax"]} />
        <ChartTooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35, strokeWidth: 1 }}
          content={(props) => <KitTooltip {...props} valueFormatter={formatKes} />}
        />
        <Area
          type="monotone"
          dataKey="total"
          name="Booked so far"
          stroke={color}
          strokeWidth={MARK.line}
          fill={`url(#wash-${id})`}
          dot={false}
          activeDot={{ r: MARK.dot, fill: color, stroke: "var(--card)", strokeWidth: MARK.ring }}
          isAnimationActive={animate}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartContainer>
  )
}
