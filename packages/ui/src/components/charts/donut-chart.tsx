"use client"

import { Cell, Pie, PieChart } from "recharts"
import type { NamedValue } from "@workspace/ops-contracts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@workspace/ui/components/chart"
import {
  DIM_TRANSITION,
  KitTooltip,
  chartColor,
  defaultFormat,
  useActiveMark,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Share of a total, with the total in the centre and a legend row per slice (name, value,
 * share), so identity never rests on colour alone. Slices keep input order and colour by
 * position: pass rows in a stable order and fold the tail into "Other" first (`foldOther`).
 */
export function DonutChart({
  data,
  centerLabel,
  valueFormatter = defaultFormat,
  className,
}: {
  data: NamedValue[]
  centerLabel?: { label: string; value: string }
  valueFormatter?: (value: number) => string
  className?: string
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0)
  // Hovering a slice or its legend row lifts it, dims the rest and shows it in the centre.
  const { active, set, opacityOf } = useActiveMark()
  const hovered = active === null ? null : data[active]
  const center = hovered
    ? { value: valueFormatter(hovered.value), label: hovered.name }
    : centerLabel
  const config: ChartConfig = Object.fromEntries(
    data.map((row, i) => [row.name, { label: row.name, color: chartColor(i) }])
  )

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row", className)}>
      <div className="relative size-44 shrink-0">
        <ChartContainer config={config} className="aspect-square size-full">
          <PieChart>
            <ChartTooltip content={(props) => <KitTooltip {...props} valueFormatter={valueFormatter} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="100%"
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseEnter={(_, index) => set(index)}
              onMouseLeave={() => set(null)}
            >
              {data.map((row, i) => (
                <Cell key={row.name} fill={chartColor(i)} fillOpacity={opacityOf(i)} style={DIM_TRANSITION} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {center ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <span className="text-xl font-semibold tabular-nums">{center.value}</span>
            <span className="max-w-full truncate text-xs text-muted-foreground">{center.label}</span>
          </div>
        ) : null}
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((row, i) => (
          <li
            key={row.name}
            className="flex items-center gap-2"
            onMouseEnter={() => set(i)}
            onMouseLeave={() => set(null)}
          >
            {/* Only the swatch dims: dimmed label text would drop below readable contrast. */}
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ background: chartColor(i), opacity: opacityOf(i), ...DIM_TRANSITION }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            <span className="tabular-nums">{valueFormatter(row.value)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
