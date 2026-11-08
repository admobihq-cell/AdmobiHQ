"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import type { DriverApplicationListItemDto, PaginatedResponse } from "@workspace/ops-contracts"
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
import { DRIVER_APPLICATIONS_PAGE } from "@/lib/entity-pages"

const STATUS_FILTERS = ["submitted", "approved", "rejected", "changes_requested"].map((value) => ({
  value,
  label: formatLabel(value),
}))

function ApplicationLink({
  id,
  className,
  children,
}: {
  id: number
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={`/driver-applications/${id}`} className={className}>
      {children}
    </Link>
  )
}

const columns: ColumnDef<DriverApplicationListItemDto, any>[] = [
  {
    id: "submitted",
    header: "Submitted",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <ApplicationLink id={row.original.id} className="block px-2 py-2 text-muted-foreground">
        {formatDateTime(row.original.submitted_at ?? row.original.created_at)}
      </ApplicationLink>
    ),
  },
  {
    id: "name",
    header: "Name",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <ApplicationLink id={row.original.id} className="block px-2 py-2 font-medium">
        {row.original.full_name ?? "—"}
      </ApplicationLink>
    ),
  },
  {
    id: "phone",
    header: "Phone",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <ApplicationLink id={row.original.id} className="block px-2 py-2">
        {row.original.phone ?? "—"}
      </ApplicationLink>
    ),
  },
  {
    id: "city",
    header: "City",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <ApplicationLink id={row.original.id} className="block px-2 py-2">
        {row.original.city ?? "—"}
      </ApplicationLink>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

const exportColumns: ExportColumn<DriverApplicationListItemDto>[] = [
  {
    key: "submitted",
    header: "Submitted",
    value: (r) => formatDateTime(r.submitted_at ?? r.created_at),
  },
  { key: "name", header: "Name", value: (r) => r.full_name },
  { key: "phone", header: "Phone", value: (r) => r.phone },
  { key: "city", header: "City", value: (r) => r.city },
  { key: "status", header: "Status", value: (r) => r.status },
]

export function DriverApplicationsView({
  initialData,
}: {
  initialData: PaginatedResponse<DriverApplicationListItemDto>
}) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim())
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSize] = useState(initialData.pageSize ?? 25)

  const applicationsQuery = useQuery({
    queryKey: ["ops-driver-applications", { page, pageSize, status, search: debouncedSearch }],
    queryFn: () =>
      client.driverApplications.list({
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
  const data = applicationsQuery.data ?? initialData
  const loading = applicationsQuery.isLoading

  useEffect(() => {
    if (applicationsQuery.isError) toast.error(formatApiError(applicationsQuery.error))
  }, [applicationsQuery.isError, applicationsQuery.error])

  const selection = useRowSelection(data.items, [page, pageSize, status, debouncedSearch])

  const exportRows = (format: ExportFormat, rows: DriverApplicationListItemDto[], scope: "selected" | null) =>
    void exportTableRows({
      format,
      title: DRIVER_APPLICATIONS_PAGE.title,
      scope,
      columns: exportColumns,
      rows,
      entity: "driver_applications",
      client,
    })

  const ids = () => Array.from(selection.selectedIds)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={DRIVER_APPLICATIONS_PAGE.title} description={DRIVER_APPLICATIONS_PAGE.description} />

      <TableToolbar
        search={{
          value: search,
          onChange: (next) => {
            setSearch(next)
            setPage(1)
          },
          placeholder: "Search name, phone or city…",
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
          noun={selection.count === 1 ? "application" : "applications"}
          onApprove={() => client.driverApplications.bulkReview({ ids: ids(), decision: "approved" })}
          onReject={(reason) =>
            client.driverApplications.bulkReview({ ids: ids(), decision: "rejected", reason })
          }
          onDone={() => {
            selection.clear()
            void queryClient.invalidateQueries({ queryKey: ["ops-driver-applications"] })
          }}
        />
      </BulkBar>

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {data.items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            {loading ? "Loading…" : "No applications found."}
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
