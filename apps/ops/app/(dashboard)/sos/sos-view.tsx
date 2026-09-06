"use client"

import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Loader2, MapPin, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react"

import {
  ACK_TARGET_SECONDS,
  SAFETY_INCIDENT_STATUSES,
  SAFETY_INCIDENT_TYPES,
  SAFETY_TERMINAL_STATUSES,
  formatLabel,
  type SafetyIncidentDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { IncidentTypeIcon } from "@/components/incident-type-icon"
import { PageHero } from "@/components/ui/page-hero"
import { StatusBadge } from "@/components/status-badge"
import { TablePagination } from "@/components/ui/table-pagination"
import { useOpsClient } from "@/lib/ops-client"

const ALL = "__all__"
const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)

/** Unacknowledged and still open — the only rows that matter in the first
 *  five minutes, and the ones the banner counts and the sort floats. */
function isAwaitingAck(incident: SafetyIncidentDto): boolean {
  return !incident.acknowledged_at && !TERMINAL.has(incident.status)
}

function mapsUrl(incident: SafetyIncidentDto): string | null {
  const lat = incident.last_lat ?? incident.reported_lat
  const lng = incident.last_lng ?? incident.reported_lng
  if (lat === null || lng === null) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function SosLink({
  id,
  className,
  children,
}: {
  id: number
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={`/sos/${id}`} className={className}>
      {children}
    </Link>
  )
}

/**
 * Counts up in real time while a report is unacknowledged, then freezes into
 * "Acked 3 min ago". A static timestamp would make ops do the subtraction
 * themselves, which is exactly the arithmetic nobody does during an incident.
 */
function AckClock({ incident }: { incident: SafetyIncidentDto }) {
  const [now, setNow] = useState(() => Date.now())

  const waiting = isAwaitingAck(incident)
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [waiting])

  if (incident.acknowledged_at) {
    const mins = Math.floor(
      (new Date(incident.acknowledged_at).getTime() - new Date(incident.created_at).getTime()) /
        60_000,
    )
    return (
      <span className="whitespace-nowrap text-muted-foreground">
        Acked in {mins}m
      </span>
    )
  }

  if (TERMINAL.has(incident.status)) {
    return <span className="whitespace-nowrap text-muted-foreground">—</span>
  }

  const seconds = Math.max(0, Math.floor((now - new Date(incident.created_at).getTime()) / 1000))
  const late = seconds > ACK_TARGET_SECONDS

  return (
    <span
      className={cn(
        "whitespace-nowrap font-medium tabular-nums",
        late ? "text-destructive" : "text-amber-600",
      )}
    >
      Unacked {Math.floor(seconds / 60)}m {String(seconds % 60).padStart(2, "0")}s
    </span>
  )
}

const SEVERITY_CLASS: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  medium: "border-border bg-muted text-muted-foreground",
}

const columns: ColumnDef<SafetyIncidentDto, unknown>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Waiting"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <SosLink id={row.original.id} className="block">
        <AckClock incident={row.original} />
      </SosLink>
    ),
  },
  {
    id: "driver",
    header: "Driver",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <SosLink id={row.original.id} className="text-sm font-medium">
          {row.original.driver_name ?? "Unnamed driver"}
        </SosLink>
        {row.original.driver_phone ? (
          // A direct tel: link, not plain text — the first action on an SOS is
          // always to call, and copy-pasting a number costs seconds.
          <a
            href={`tel:${row.original.driver_phone}`}
            className="text-xs text-muted-foreground hover:underline"
          >
            {row.original.driver_phone}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No number on file</span>
        )}
      </div>
    ),
  },
  {
    id: "type",
    header: "What happened",
    cell: ({ row }) => (
      <SosLink id={row.original.id} className="flex items-center gap-2 text-sm">
        <IncidentTypeIcon type={row.original.type} />
        {formatLabel(row.original.type)}
      </SosLink>
    ),
  },
  {
    accessorKey: "severity",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Severity"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <SosLink id={row.original.id} className="block">
        <Badge variant="outline" className={cn(SEVERITY_CLASS[row.original.severity])}>
          {formatLabel(row.original.severity)}
        </Badge>
      </SosLink>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Status"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <SosLink id={row.original.id} className="block">
        <StatusBadge status={row.original.status} />
      </SosLink>
    ),
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const href = mapsUrl(row.original)
      if (!href) {
        return <span className="text-xs text-muted-foreground">Unavailable</span>
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          <MapPin className="size-3.5" aria-hidden />
          Open map
        </a>
      )
    },
  },
  {
    id: "photos",
    header: "Photos",
    cell: ({ row }) => (
      <SosLink id={row.original.id} className="block text-sm tabular-nums text-muted-foreground">
        {row.original.photo_count || "—"}
      </SosLink>
    ),
  },
]

export function SosView() {
  const client = useOpsClient()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sorting, setSorting] = useState<SortingState>([])

  const sort = sorting[0]
  const sortBy = sort?.id === "status" || sort?.id === "severity" ? sort.id : "created_at"
  const sortDir = sort?.desc === false ? "asc" : "desc"

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [search])

  const sosQuery = useQuery({
    queryKey: ["ops-sos", { search: debouncedSearch, status, type, page, pageSize, sortBy, sortDir }],
    queryFn: () =>
      client.safety.list({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : status,
        type: type === ALL ? undefined : type,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
    // Poll hard while anything is live, back off when the queue is quiet — a
    // 15s window on an idle queue is pointless load on Neon.
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const live = items.some((i) => i.status === "new" || i.status === "acknowledged")
      return live ? 15_000 : 60_000
    },
  })

  const data = sosQuery.data ?? null
  const loading = sosQuery.isLoading
  const fetchError = sosQuery.isError ? formatApiError(sosQuery.error) : null
  const refresh = () => sosQuery.refetch()

  // Unacknowledged incidents float to the top regardless of the active sort.
  // The whole point of this screen is that nothing new goes unseen, and a
  // column sort must not be able to bury a live emergency on page 2.
  const rows = useMemo(() => {
    const raw = data?.items ?? []
    return [...raw].sort((a, b) => {
      const aWaiting = isAwaitingAck(a)
      const bWaiting = isAwaitingAck(b)
      if (aWaiting !== bWaiting) return aWaiting ? -1 : 1
      return 0
    })
  }, [data])

  const unackedCount = rows.filter(isAwaitingAck).length

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, type, pageSize, sortBy, sortDir])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="SOS"
        description="Safety incidents reported by drivers from the driver app. Acknowledge fast, then call them."
      />

      {unackedCount > 0 ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {unackedCount} unacknowledged {unackedCount === 1 ? "report" : "reports"} — respond now.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search driver, phone, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {SAFETY_INCIDENT_STATUSES.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {SAFETY_INCIDENT_TYPES.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          loading={loading}
          loadingText="Refresh"
          className="ml-auto"
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {fetchError ? <ApiErrorBanner message={fetchError} onRetry={() => void refresh()} /> : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {loading && !data ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
            <ShieldCheck className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No incidents. Good.</p>
            <p className="text-xs text-muted-foreground">
              SOS reports from the driver app appear here immediately.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(row) => String(row.id)}
            rowClassName={(row) =>
              cn(
                "cursor-pointer hover:bg-muted/40",
                isAwaitingAck(row) && "bg-destructive/5",
              )
            }
          />
        )}
      </div>

      {data && data.total > 0 ? (
        <TablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  )
}
