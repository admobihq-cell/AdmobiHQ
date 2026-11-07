"use client"

import {
  AD_FORMATS,
  DAYPARTS,
  DAYPART_LABELS,
  REPORT_MARKETS,
  formatLabel,
} from "@workspace/ops-contracts"

import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useCampaigns } from "@/lib/use-campaigns"

export const REPORT_FILTER_KEYS = ["campaign", "market", "format", "daypart"] as const

const ALL = "all"

function Field({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string | null) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
        <SelectTrigger id={id} size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** The filter controls inside the toolbar's Filters popover. Values live in the URL. */
export function ReportFilterFields({
  filters,
  onChange,
}: {
  filters: Record<string, string>
  onChange: (key: string, value: string | null) => void
}) {
  const campaigns = useCampaigns().data ?? []
  return (
    <div className="grid gap-3">
      <Field
        id="filter-campaign"
        label="Campaign"
        value={filters.campaign}
        onChange={(v) => onChange("campaign", v)}
        options={campaigns.map((c) => ({ value: String(c.id), label: c.name }))}
      />
      <Field
        id="filter-market"
        label="Market"
        value={filters.market}
        onChange={(v) => onChange("market", v)}
        options={REPORT_MARKETS.map((m) => ({ value: m, label: m }))}
      />
      <Field
        id="filter-format"
        label="Format"
        value={filters.format}
        onChange={(v) => onChange("format", v)}
        options={AD_FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
      />
      <Field
        id="filter-daypart"
        label="Time of day"
        value={filters.daypart}
        onChange={(v) => onChange("daypart", v)}
        options={DAYPARTS.map((d) => ({ value: d, label: DAYPART_LABELS[d] }))}
      />
    </div>
  )
}

/** "CBD · Evening", for the toolbar's Showing line. */
export function showingText(
  filters: Record<string, string>,
  campaignName: (id: string) => string | undefined
): string | undefined {
  const parts = [
    filters.campaign ? (campaignName(filters.campaign) ?? "One campaign") : null,
    filters.market ?? null,
    filters.format ? formatLabel(filters.format) : null,
    filters.daypart ? (DAYPART_LABELS[filters.daypart as (typeof DAYPARTS)[number]] ?? filters.daypart) : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : undefined
}
