"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import type { DriverApplicationListItemDto, PaginatedResponse } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { StatusBadge } from "@/components/status-badge"
import { PageHero } from "@/components/ui/page-hero"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import { DRIVER_APPLICATIONS_PAGE } from "@/lib/entity-pages"

const STATUS_FILTERS = ["all", "submitted", "approved", "rejected", "changes_requested"] as const

export function DriverApplicationsView({
  initialData,
}: {
  initialData: PaginatedResponse<DriverApplicationListItemDto>
}) {
  const client = useOpsClient()
  const [data, setData] = useState(initialData)
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (page: number, statusFilter: string) => {
      setLoading(true)
      try {
        const result = await client.driverApplications.list({
          page,
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
    void load(1, status)
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {loading ? "Loading…" : "No applications found."}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="p-0">
                    <Link
                      href={`/driver-applications/${row.id}`}
                      className="block px-2 py-2 text-muted-foreground"
                    >
                      {formatDateTime(row.submitted_at ?? row.created_at)}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link
                      href={`/driver-applications/${row.id}`}
                      className="block px-2 py-2 font-medium"
                    >
                      {row.full_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link href={`/driver-applications/${row.id}`} className="block px-2 py-2">
                      {row.phone ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link href={`/driver-applications/${row.id}`} className="block px-2 py-2">
                      {row.city ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1 || loading}
              onClick={() => void load(data.page - 1, status)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages || loading}
              onClick={() => void load(data.page + 1, status)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
