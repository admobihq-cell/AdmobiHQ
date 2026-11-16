"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { formatKes, type ReportCampaignRowDto } from "@workspace/ops-contracts"

import { TickBar } from "@workspace/ui/components/charts/tick-bar"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { CampaignQuickView } from "@/components/reports/campaign-quick-view"
import {
  HEALTH_LABEL,
  HEALTH_TONE,
  NO_MATCH_MESSAGE,
  PHASE_LABEL,
  compactOrDash,
  rateTone,
} from "@/components/reports/format"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "attention", label: "Needs attention" },
]

const SORTS = [
  { value: "start", label: "Newest flight" },
  { value: "name", label: "Name" },
  { value: "delivery", label: "Lowest delivery" },
  { value: "impressions", label: "Most impressions" },
]

const PAGE_SIZE = 15

const matches = (row: ReportCampaignRowDto, filter: string) =>
  filter === "all"
    ? true
    : filter === "attention"
      ? row.health.level !== "on_track"
      : row.phase === filter

function sortRows(rows: ReportCampaignRowDto[], sort: string): ReportCampaignRowDto[] {
  const copy = [...rows]
  if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name))
  // Rows with no rate sort last, since "lowest delivery" should not lead with campaigns that have no data.
  if (sort === "delivery") return copy.sort((a, b) => (a.deliveryRate ?? 2) - (b.deliveryRate ?? 2))
  if (sort === "impressions") return copy.sort((a, b) => (b.impressions.likely ?? -1) - (a.impressions.likely ?? -1))
  return copy.sort((a, b) => (b.startsOn ?? "").localeCompare(a.startsOn ?? ""))
}

/** Reports > Campaigns. Filtering, search and sort run in the browser: an org has few campaigns. */
export function CampaignsTab({ rows, canSeeMoney }: { rows: ReportCampaignRowDto[]; canSeeMoney: boolean }) {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("start")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ReportCampaignRowDto | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sortRows(
      rows.filter((r) => matches(r, filter) && (!q || r.name.toLowerCase().includes(q))),
      sort
    )
  }, [rows, filter, search, sort])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const reset = (update: () => void) => {
    update()
    setPage(1)
  }

  const columns: LedgerColumn<ReportCampaignRowDto>[] = [
    {
      key: "name",
      header: "Campaign",
      className: "min-w-44",
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.market ?? "No market"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone={HEALTH_TONE[r.health.level]}>{HEALTH_LABEL[r.health.level]}</StatusPill>
          <span className="text-xs text-muted-foreground">{r.phase ? PHASE_LABEL[r.phase] : r.status}</span>
        </div>
      ),
    },
    {
      key: "flight",
      header: "Flight",
      render: (r) => (r.startsOn && r.endsOn ? `${r.startsOn} to ${r.endsOn}` : "Not scheduled"),
    },
    ...(canSeeMoney
      ? [
          { key: "budget", header: "Budget", align: "right" as const, render: (r: ReportCampaignRowDto) => (r.budgetKes === null ? "—" : formatKes(r.budgetKes)) },
          { key: "spent", header: "Spent", align: "right" as const, render: (r: ReportCampaignRowDto) => (r.spentKes === null ? "—" : formatKes(r.spentKes)) },
        ]
      : []),
    {
      key: "delivery",
      header: "Delivery",
      render: (r) => <TickBar percent={r.deliveryRate === null ? null : r.deliveryRate * 100} tone={rateTone(r.deliveryRate)} />,
    },
    { key: "impressions", header: "Est. impressions", align: "right", render: (r) => compactOrDash(r.impressions.likely) },
    ...(canSeeMoney
      ? [{ key: "cpm", header: "Per 1,000", align: "right" as const, render: (r: ReportCampaignRowDto) => (r.costPerThousandKes === null ? "—" : formatKes(r.costPerThousandKes)) }]
      : []),
  ]

  return (
    <>
      <LedgerCard
        title="Campaigns"
        description="Every campaign with its delivery. Select one for a summary"
        filterTabs={{
          tabs: FILTERS.map((f) => ({ ...f, count: rows.filter((r) => matches(r, f.value)).length })),
          value: filter,
          onChange: (value) => reset(() => setFilter(value)),
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => reset(() => setSearch(e.target.value))}
                placeholder="Search campaigns"
                aria-label="Search campaigns"
                className="h-8 w-48 pl-8"
              />
            </div>
            <Select value={sort} onValueChange={(value) => reset(() => setSort(value))}>
              <SelectTrigger size="sm" aria-label="Sort campaigns" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        columns={columns}
        rows={visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
        rowKey={(r) => String(r.id)}
        onRowClick={setSelected}
        footer={{
          viewing: `Viewing ${Math.min(PAGE_SIZE, visible.length - (current - 1) * PAGE_SIZE)} out of ${visible.length}`,
          page: current,
          pageCount,
          onPageChange: setPage,
        }}
        empty={rows.length === 0 ? "Campaigns appear here once you create one." : NO_MATCH_MESSAGE}
      />
      <CampaignQuickView campaign={selected} onClose={() => setSelected(null)} />
    </>
  )
}
