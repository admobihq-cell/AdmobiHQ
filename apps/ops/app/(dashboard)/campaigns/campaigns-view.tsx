"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import type { CampaignListItemDto, PaginatedResponse } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { StatusBadge } from "@/components/status-badge"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { TablePagination } from "@/components/ui/table-pagination"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import { CAMPAIGNS_PAGE } from "@/lib/entity-pages"

const STATUS_FILTERS = [
  "all",
  "submitted",
  "approved",
  "changes_requested",
  "rejected",
  "cancelled",
  "draft",
] as const

function CampaignLink({
  id,
  className,
  children,
}: {
  id: number
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={`/campaigns/${id}`} className={className}>
      {children}
    </Link>
  )
}

function formatBudget(value: string | null): string {
  if (!value) return "—"
  return `KES ${Number(value).toLocaleString("en-KE")}`
}

function formatFlight(row: CampaignListItemDto): string {
  if (!row.starts_on || !row.ends_on) return "—"
  return `${row.starts_on} → ${row.ends_on}`
}

const columns: ColumnDef<CampaignListItemDto, any>[] = [
  {
    id: "submitted",
    header: "Submitted",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2 text-muted-foreground">
        {formatDateTime(row.original.submitted_at ?? row.original.created_at)}
      </CampaignLink>
    ),
  },
  {
    id: "name",
    header: "Campaign",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2 font-medium">
        {row.original.name}
      </CampaignLink>
    ),
  },
  {
    id: "advertiser",
    header: "Advertiser",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2">
        {row.original.contact_email ?? "—"}
      </CampaignLink>
    ),
  },
  {
    id: "market",
    header: "Market",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2">
        {row.original.market ?? "—"}
      </CampaignLink>
    ),
  },
  {
    id: "flight",
    header: "Flight",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2 tabular-nums">
        {formatFlight(row.original)}
      </CampaignLink>
    ),
  },
  {
    id: "budget",
    header: "Budget",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2 tabular-nums">
        {formatBudget(row.original.budget_kes)}
      </CampaignLink>
    ),
  },
  {
    id: "creatives",
    header: "Creative",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <CampaignLink id={row.original.id} className="block px-2 py-2 tabular-nums">
        {row.original.creative_count}
      </CampaignLink>
    ),
  },
  {
    id: "status",
    header: "Status",
    // Ops sees the raw review status; the advertiser-facing apps translate
    // "submitted" to "In queue". A reviewer wants the real column value.
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

export function CampaignsView({
  initialData,
}: {
  initialData: PaginatedResponse<CampaignListItemDto>
}) {
  const client = useOpsClient()
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSize] = useState(initialData.pageSize ?? 25)

  const campaignsQuery = useQuery({
    queryKey: ["ops-campaigns", { page, pageSize, status }],
    queryFn: () =>
      client.campaigns.list({
        page,
        pageSize,
        status: status === "all" ? undefined : status,
      }),
    initialData:
      page === initialData.page && pageSize === (initialData.pageSize ?? 25) && status === "all"
        ? initialData
        : undefined,
    placeholderData: keepPreviousData,
  })
  const data = campaignsQuery.data ?? initialData
  const loading = campaignsQuery.isLoading

  useEffect(() => {
    if (campaignsQuery.isError) toast.error(formatApiError(campaignsQuery.error))
  }, [campaignsQuery.isError, campaignsQuery.error])

  function changeStatus(next: (typeof STATUS_FILTERS)[number]) {
    setStatus(next)
    setPage(1)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={CAMPAIGNS_PAGE.title} description={CAMPAIGNS_PAGE.description} />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => changeStatus(v as typeof status)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {data.items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            {loading ? "Loading…" : "No campaigns found."}
          </div>
        ) : (
          <DataTable columns={columns} data={data.items} getRowId={(row) => String(row.id)} />
        )}
      </div>

      {data.total > 0 ? (
        <TablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      ) : null}
    </div>
  )
}
