"use client"

import { toWeekGrid, type DailyPoint } from "@workspace/ops-contracts"

import { defaultFormat } from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** Five steps of one hue: magnitude is sequential, never categorical. */
const LEVELS = [22, 40, 58, 78, 100]

function levelColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "var(--chart-track)"
  const step = LEVELS[Math.min(LEVELS.length - 1, Math.floor((value / max) * LEVELS.length))]!
  // sRGB, not oklch: mixing in oklch drifts the hue toward the track's and reads as several colours.
  return `color-mix(in srgb, var(--chart-2) ${step}%, var(--chart-track))`
}

function dayLabel(weekStart: string, index: number): string {
  const d = new Date(Date.parse(`${weekStart}T00:00:00Z`) + index * 86_400_000)
  return `${WEEKDAYS[index]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/**
 * A contributions-style activity grid: one column per week, Monday to Sunday down, shaded by
 * how much happened that day. Days with no data are an empty outline, not "zero". Each cell
 * has a hover and focus tooltip; scrolls sideways inside its own box on a phone.
 */
export function ActivityGrid({
  points,
  valueKey,
  valueFormatter = defaultFormat,
  label,
  className,
}: {
  points: DailyPoint[]
  valueKey: string
  valueFormatter?: (value: number) => string
  /** What a cell measures, for the screen-reader summary ("Hours on the road"). */
  label: string
  className?: string
}) {
  const { weeks, max } = toWeekGrid(points, valueKey)
  const active = weeks.flatMap((w) => w.days).filter((d): d is number => d !== null && d > 0).length
  const summary = `${label}: ${active} active days over ${weeks.length} weeks${max > 0 ? `, busiest ${valueFormatter(max)}` : ""}`

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="overflow-x-auto">
        {/* One image with a summary, not hundreds of tab stops: every value is in the card's table view. */}
        <div role="img" aria-label={summary} className="flex min-w-max gap-[3px]">
          <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground" aria-hidden>
            {WEEKDAYS.map((d, i) => (
              <span key={d} className="flex h-3 items-center leading-none">
                {i % 2 === 0 ? d : ""}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week.start} className="flex flex-col gap-[3px]">
              {week.days.map((value, i) => {
                const tip = `${dayLabel(week.start, i)} · ${value === null ? "no data" : valueFormatter(value)}`
                return (
                  // A native title is the hover tip: one Radix tooltip per cell was hundreds of instances.
                  <span
                    key={i}
                    title={tip}
                    className={cn(
                      "size-3 rounded-[3px] transition-shadow hover:ring-2 hover:ring-foreground/50",
                      value === null && "border border-border/70"
                    )}
                    style={{ background: value === null ? "transparent" : levelColor(value, max) }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground" aria-hidden>
        <span className="pr-1">Less</span>
        {[0, ...LEVELS].map((step) => (
          <span
            key={step}
            className="size-3 rounded-[3px]"
            style={{
              background: step === 0 ? "var(--chart-track)" : `color-mix(in srgb, var(--chart-2) ${step}%, var(--chart-track))`,
            }}
          />
        ))}
        <span className="pl-1">More</span>
      </div>
    </div>
  )
}
