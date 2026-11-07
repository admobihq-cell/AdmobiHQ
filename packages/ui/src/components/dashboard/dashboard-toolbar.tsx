"use client"

import * as React from "react"
import { CalendarDays, Download, ListFilter } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

/** Either a preset (`range`) or a custom pair (`from` + `to`, YYYY-MM-DD). Matches the API params. */
export type ToolbarRange = { range?: string; from?: string; to?: string }

const PRESETS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
] as const

const MAX_CUSTOM_DAYS = 366

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1
}

function CustomRange({
  range,
  onApply,
}: {
  range: ToolbarRange
  onApply: (next: ToolbarRange) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [from, setFrom] = React.useState(range.from ?? "")
  const [to, setTo] = React.useState(range.to ?? "")
  const active = Boolean(range.from && range.to)

  const span = from && to ? daysBetween(from, to) : null
  const error =
    span === null
      ? null
      : span < 1
        ? "The end date is before the start date."
        : span > MAX_CUSTOM_DAYS
          ? `Pick a range of ${MAX_CUSTOM_DAYS} days or fewer.`
          : null

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setFrom(range.from ?? "")
          setTo(range.to ?? "")
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant={active ? "secondary" : "ghost"} size="sm" aria-pressed={active}>
          <CalendarDays aria-hidden />
          {active ? `${range.from} to ${range.to}` : "Custom"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-from">From</Label>
            <Input id="range-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-to">To</Label>
            <Input id="range-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button
          size="sm"
          disabled={!from || !to || Boolean(error)}
          onClick={() => {
            onApply({ from, to })
            setOpen(false)
          }}
        >
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Left: view, filters, "Showing: …". Right: date range, export. State is owned by the page
 * (usually the URL), so the toolbar only reports changes.
 */
export function DashboardToolbar({
  view,
  filters,
  showing,
  range,
  onRangeChange,
  onExport,
  badge,
  className,
}: {
  view?: React.ReactNode
  filters?: { count: number; content: React.ReactNode; onClear?: () => void }
  /** e.g. "CBD · Evening". Shown after the filters button when anything is filtered. */
  showing?: string
  range: ToolbarRange
  onRangeChange: (next: ToolbarRange) => void
  onExport?: () => void
  /** A measurement badge or similar, shown beside the range. */
  badge?: React.ReactNode
  className?: string
}) {
  const custom = Boolean(range.from && range.to)

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {view}
        {filters ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter aria-hidden />
                Filters
                {filters.count > 0 ? (
                  <Badge variant="secondary" className="h-4 px-1.5 tabular-nums">
                    {filters.count}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-80 flex-col gap-3">
              {filters.content}
              {filters.onClear && filters.count > 0 ? (
                <Button variant="ghost" size="sm" onClick={filters.onClear}>
                  Clear filters
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
        {showing ? (
          <p className="text-xs text-muted-foreground">
            Showing: <span className="text-foreground">{showing}</span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        <div role="group" aria-label="Date range" className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
          {PRESETS.map((preset) => {
            const active = !custom && (range.range ?? "30d") === preset.value
            return (
              <Button
                key={preset.value}
                variant={active ? "secondary" : "ghost"}
                size="xs"
                aria-pressed={active}
                onClick={() => onRangeChange({ range: preset.value })}
              >
                {preset.label}
              </Button>
            )
          })}
          <CustomRange range={range} onApply={onRangeChange} />
        </div>
        {onExport ? (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download aria-hidden />
            Export
          </Button>
        ) : null}
      </div>
    </div>
  )
}
