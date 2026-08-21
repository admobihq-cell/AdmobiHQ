"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import type { DriverApplicationListItemDto, PaginatedResponse } from "@workspace/ops-contracts"
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
import { DRIVER_APPLICATIONS_PAGE } from "@/lib/entity-pages"

const STATUS_FILTERS = ["all", "submitted", "approved", "rejected", "changes_requested"] as const

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

export function DriverApplicationsView({
  initialData,
}: {
  initialData: PaginatedResponse<DriverApplicationListItemDto>
}) {
  const client = useOpsClient()
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSize] = useState(initialData.pageSize ?? 25)

  const applicationsQuery = useQuery({
    queryKey: ["ops-driver-applications", { page, pageSize, status }],
    queryFn: () =>
      client.driverApplications.list({
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
  const data = applicationsQuery.data ?? initialData
  const loading = applicationsQuery.isLoading

  useEffect(() => {
    if (applicationsQuery.isError) toast.error(formatApiError(applicationsQuery.error))
  }, [applicationsQuery.isError, applicationsQuery.error])

  function changeStatus(next: (typeof STATUS_FILTERS)[number]) {
    setStatus(next)
    setPage(1)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={DRIVER_APPLICATIONS_PAGE.title} description={DRIVER_APPLICATIONS_PAGE.description} />

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
            {loading ? "Loading…" : "No applications found."}
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
