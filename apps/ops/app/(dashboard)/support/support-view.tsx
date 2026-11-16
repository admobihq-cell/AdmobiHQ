"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Inbox, Loader2, RefreshCw } from "lucide-react"

import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  formatLabel,
  type SupportCaseDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { BulkBar, FilterSelect, TableToolbar } from "@/components/ui/table-toolbar"
import { TablePagination } from "@/components/ui/table-pagination"
import { StatusBadge } from "@/components/entity/status-badge"
import { SupportCategoryIcon } from "@/components/support/support-category-icon"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import { exportTableRows, type ExportColumn, type ExportFormat } from "@/lib/table-export"
import { useRowSelection } from "@/lib/use-row-selection"

const toOptions = (keys: readonly string[]) => keys.map((value) => ({ value, label: formatLabel(value) }))

const exportColumns: ExportColumn<SupportCaseDto>[] = [
  { key: "opened", header: "Opened", value: (r) => formatDateTime(r.created_at) },
  { key: "subject", header: "Subject", value: (r) => r.subject },
  { key: "contact", header: "Contact", value: (r) => r.contact_name },
  { key: "email", header: "Email", value: (r) => r.contact_email },
  { key: "category", header: "Category", value: (r) => formatLabel(r.category) },
  { key: "priority", header: "Priority", value: (r) => formatLabel(r.priority) },
  { key: "status", header: "Status", value: (r) => formatLabel(r.status) },
  { key: "assignee", header: "Assignee", value: (r) => r.assigned_to_email },
]

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function SupportLink({
  id,
  className,
  children,
}: {
  id: number
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={`/support/${id}`} className={className}>
      {children}
    </Link>
  )
}

const columns: ColumnDef<SupportCaseDto, any>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Date"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="block whitespace-nowrap text-muted-foreground">
        {formatDateTime(row.original.created_at)}
      </SupportLink>
    ),
  },
  {
    id: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="flex items-center gap-2 font-medium">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            row.original.priority === "urgent"
              ? "bg-destructive"
              : row.original.priority === "high"
                ? "bg-amber-500"
                : "bg-transparent",
          )}
          aria-label={
            row.original.priority === "urgent" || row.original.priority === "high"
              ? `${formatLabel(row.original.priority)} priority`
              : undefined
          }
        />
        {row.original.subject}
      </SupportLink>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {initials(row.original.contact_name)}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{row.original.contact_name}</span>
          <span className="text-xs text-muted-foreground">{row.original.contact_email}</span>
        </div>
      </SupportLink>
    ),
  },
  {
    id: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="block">
        <Badge variant="outline">{formatLabel(row.original.channel)}</Badge>
      </SupportLink>
    ),
  },
  {
    id: "category",
    header: "Category",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="flex items-center gap-1.5 text-muted-foreground">
        <SupportCategoryIcon category={row.original.category} className="size-3.5" />
        <span className="text-foreground">{formatLabel(row.original.category)}</span>
      </SupportLink>
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
      <SupportLink id={row.original.id} className="block">
        <StatusBadge status={row.original.status} />
      </SupportLink>
    ),
  },
]

export function SupportView() {
  const client = useOpsClient()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("")
  const [category, setCategory] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sorting, setSorting] = useState<SortingState>([])

  const sort = sorting[0]
  const sortBy = sort?.id === "status" ? "status" : "created_at"
  const sortDir = sort?.desc === false ? "asc" : "desc"

  // Debounce the search box before it feeds the query key, same 300ms the
  // original hand-rolled refresh() used — an empty search applies instantly.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [search])

  const supportQuery = useQuery({
    queryKey: ["ops-support", { search: debouncedSearch, status, category, page, pageSize, sortBy, sortDir }],
    queryFn: () =>
      client.support.list({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        status: status || undefined,
        category: category || undefined,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
  })
  const data = supportQuery.data ?? null
  const loading = supportQuery.isLoading
  const fetchError = supportQuery.isError ? formatApiError(supportQuery.error) : null
  const refresh = () => supportQuery.refetch()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, category, pageSize, sortBy, sortDir])

  const items = data?.items ?? []
  const selection = useRowSelection(items, [
    page,
    pageSize,
    sortBy,
    sortDir,
    status,
    category,
    debouncedSearch,
  ])
  const exportRows = (format: ExportFormat, rows: SupportCaseDto[], scope: "selected" | null) =>
    void exportTableRows({
      format,
      title: "Support",
      scope,
      columns: exportColumns,
      rows,
      entity: "support",
      client,
    })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Support"
        description="Cases opened from the landing page, customer web, and customer mobile."
      />

      <TableToolbar
        search={{ value: search, onChange: setSearch, placeholder: "Search subject, name, email…" }}
        filters={
          <>
            <FilterSelect
              value={status}
              onChange={setStatus}
              options={toOptions(SUPPORT_STATUSES)}
              allLabel="All statuses"
            />
            <FilterSelect
              value={category}
              onChange={setCategory}
              options={toOptions(SUPPORT_CATEGORIES)}
              allLabel="All categories"
            />
          </>
        }
        onExport={(format) => exportRows(format, items, null)}
        exportDisabled={!items.length}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            loading={loading}
            loadingText="Refresh"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      <BulkBar
        count={selection.count}
        onExport={(format) => exportRows(format, selection.selectedRows, "selected")}
        onClear={selection.clear}
      />

      {fetchError ? (
        <ApiErrorBanner
          message={fetchError}
          onRetry={() => void refresh()}
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {loading && !data ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.items.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
            <Inbox className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No cases yet.</p>
            <p className="text-xs text-muted-foreground">
              Requests from the landing page and customer apps will appear here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={[selection.selectColumn, ...columns]}
            data={data.items}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(row) => String(row.id)}
            rowClassName={(row) =>
              cn(
                "cursor-pointer hover:bg-muted/40",
                selection.selectedIds.has(row.id) && "bg-muted/50",
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
