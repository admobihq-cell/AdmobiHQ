"use client"

import { useCallback, useEffect, useState } from "react"
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
  const [data, setData] = useState(initialData)
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const [pageSize, setPageSize] = useState(initialData.pageSize ?? 25)
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (page: number, statusFilter: string, size: number) => {
      setLoading(true)
      try {
        const result = await client.driverApplications.list({
          page,
          pageSize: size,
          status: statusFilter === "all" ? undefined : statusFilter,
        })
        setData(result)
      } catch (e) {
        toast.error(formatApiError(e))
      } finally {
        setLoading(false)
      }
    },
    [client],
  )

  useEffect(() => {
    if (status === "all" && data.page === initialData.page) return
    void load(1, status, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={DRIVER_APPLICATIONS_PAGE.title} description={DRIVER_APPLICATIONS_PAGE.description} />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
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
          onPageChange={(page) => void load(page, status, pageSize)}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            void load(1, status, size)
          }}
        />
      ) : null}
    </div>
  )
}
