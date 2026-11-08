"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import type { CampaignListItemDto, PaginatedResponse } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { cn } from "@workspace/ui/lib/utils"
import { StatusBadge } from "@/components/entity/status-badge"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { BulkReviewActions } from "@/components/review/bulk-review-actions"
import { PageHero } from "@/components/ui/page-hero"
import { BulkBar, FilterSelect, TableToolbar } from "@/components/ui/table-toolbar"
import { TablePagination } from "@/components/ui/table-pagination"
import { formatDateTime, formatLabel } from "@/lib/format"
import { exportTableRows, type ExportColumn, type ExportFormat } from "@/lib/table-export"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { useRowSelection } from "@/lib/use-row-selection"
import { useOpsClient } from "@/lib/ops-client"
import { CAMPAIGNS_PAGE } from "@/lib/entity-pages"

const STATUS_FILTERS = [
  "submitted",
  "approved",
  "changes_requested",
  "rejected",
  "cancelled",
  "draft",
].map((value) => ({ value, label: formatLabel(value) }))

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
        {row.original.advertiser_org_name ?? row.original.contact_email ?? "—"}
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

const exportColumns: ExportColumn<CampaignListItemDto>[] = [
  {
    key: "submitted",
    header: "Submitted",
    value: (r) => formatDateTime(r.submitted_at ?? r.created_at),
  },
  { key: "name", header: "Campaign", value: (r) => r.name },
  {
    key: "advertiser",
    header: "Advertiser",
    value: (r) => r.advertiser_org_name ?? r.contact_email,
  },
  { key: "market", header: "Market", value: (r) => r.market },
  { key: "flight", header: "Flight", value: (r) => formatFlight(r) },
  { key: "budget", header: "Budget", value: (r) => formatBudget(r.budget_kes) },
  { key: "creatives", header: "Creative", value: (r) => r.creative_count },
  { key: "status", header: "Status", value: (r) => r.status },
]

export function CampaignsView({
  initialData,
}: {
  initialData: PaginatedResponse<CampaignListItemDto>
}) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim())
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSize] = useState(initialData.pageSize ?? 25)

  const campaignsQuery = useQuery({
    queryKey: ["ops-campaigns", { page, pageSize, status, search: debouncedSearch }],
    queryFn: () =>
      client.campaigns.list({
        page,
        pageSize,
        status: status || undefined,
        search: debouncedSearch || undefined,
      }),
    initialData:
      page === initialData.page &&
      pageSize === (initialData.pageSize ?? 25) &&
      !status &&
      !debouncedSearch
        ? initialData
        : undefined,
    placeholderData: keepPreviousData,
  })
  const data = campaignsQuery.data ?? initialData
  const loading = campaignsQuery.isLoading

  useEffect(() => {
    if (campaignsQuery.isError) toast.error(formatApiError(campaignsQuery.error))
  }, [campaignsQuery.isError, campaignsQuery.error])

  const selection = useRowSelection(data.items, [page, pageSize, status, debouncedSearch])

  const exportRows = (format: ExportFormat, rows: CampaignListItemDto[], scope: "selected" | null) =>
    void exportTableRows({
      format,
      title: CAMPAIGNS_PAGE.title,
      scope,
      columns: exportColumns,
      rows,
      entity: "campaigns",
      client,
    })

  const ids = () => Array.from(selection.selectedIds)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={CAMPAIGNS_PAGE.title} description={CAMPAIGNS_PAGE.description} />

      <TableToolbar
        search={{
          value: search,
          onChange: (next) => {
            setSearch(next)
            setPage(1)
          },
          placeholder: "Search campaign, email or market…",
        }}
        filters={
          <FilterSelect
            value={status}
            onChange={(next) => {
              setStatus(next)
              setPage(1)
            }}
            options={STATUS_FILTERS}
            allLabel="All statuses"
          />
        }
        onExport={(format) => exportRows(format, data.items, null)}
        exportDisabled={!data.items.length}
      />

      <BulkBar
        count={selection.count}
        onExport={(format) => exportRows(format, selection.selectedRows, "selected")}
        onClear={selection.clear}
      >
        <BulkReviewActions
          count={selection.count}
          noun={selection.count === 1 ? "campaign" : "campaigns"}
          onApprove={() => client.campaigns.bulkReview({ ids: ids(), decision: "approved" })}
          onReject={(reason) =>
            client.campaigns.bulkReview({ ids: ids(), decision: "rejected", reason })
          }
          onDone={() => {
            selection.clear()
            void queryClient.invalidateQueries({ queryKey: ["ops-campaigns"] })
          }}
        />
      </BulkBar>

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {data.items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            {loading ? "Loading…" : "No campaigns found."}
          </div>
        ) : (
          <DataTable
            columns={[selection.selectColumn, ...columns]}
            data={data.items}
            getRowId={(row) => String(row.id)}
            rowClassName={(row) => cn(selection.selectedIds.has(row.id) && "bg-muted/50")}
          />
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
