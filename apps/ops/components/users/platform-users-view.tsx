"use client"

import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { PlatformUserDto, PlatformUserType } from "@workspace/ops-contracts"

import { formatApiError } from "@workspace/ops-api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { TablePagination } from "@/components/ui/table-pagination"
import { BulkBar, TableToolbar } from "@/components/ui/table-toolbar"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import { exportTableRows, type ExportColumn, type ExportFormat } from "@/lib/table-export"
import { useRowSelection } from "@/lib/use-row-selection"

const DEFAULT_PAGE_SIZE = 25

/** Columns Clerk's admin API can actually sort by — see
 * apps/api/lib/platform-users.ts's PlatformUserSortField. Name and status
 * have no server-side sort field, so those headers stay plain (unsortable). */
type SortableField = "email" | "phone" | "createdAt"
const SORTABLE_FIELDS: SortableField[] = ["email", "phone", "createdAt"]

function StatusBadge({ status }: { status: PlatformUserDto["status"] }) {
  if (status === "banned") return <Badge variant="destructive">Banned</Badge>
  if (status === "locked") return <Badge variant="secondary">Locked</Badge>
  return <Badge variant="outline">Active</Badge>
}

function UsersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function sortHeader(label: string) {
  return function Header({ column }: { column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc: boolean) => void } }) {
    return (
      <DataTableSortHeader
        label={label}
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    )
  }
}

const baseColumns: ColumnDef<PlatformUserDto, any>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: sortHeader("Email"),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: sortHeader("Phone"),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone ?? "—"}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: sortHeader("Joined"),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

/** Advertisers give this at sign-up; drivers never do, so the column would be a
 * full row of em-dashes on the drivers page. Clerk has no orderBy for a metadata
 * field, so it stays unsortable like Name and Status. */
const companyColumn: ColumnDef<PlatformUserDto, any> = {
  accessorKey: "company",
  header: "Company",
  cell: ({ row }) => <span className="text-muted-foreground">{row.original.company ?? "—"}</span>,
}

function columnsFor(type: PlatformUserType): ColumnDef<PlatformUserDto, any>[] {
  if (type !== "customers") return baseColumns
  const [nameColumn, ...rest] = baseColumns
  return [nameColumn!, companyColumn, ...rest]
}

function exportColumnsFor(type: PlatformUserType): ExportColumn<PlatformUserDto>[] {
  return [
    { key: "name", header: "Name", value: (u) => u.name },
    ...(type === "customers"
      ? [{ key: "company", header: "Company", value: (u: PlatformUserDto) => u.company ?? null }]
      : []),
    { key: "email", header: "Email", value: (u) => u.email },
    { key: "phone", header: "Phone", value: (u) => u.phone },
    { key: "joined", header: "Joined", value: (u) => formatDateTime(u.createdAt) },
    { key: "status", header: "Status", value: (u) => u.status },
  ]
}

export function PlatformUsersView({ type }: { type: PlatformUserType }) {
  const client = useOpsClient()
  const columns = useMemo(() => columnsFor(type), [type])

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [sorting, setSorting] = useState<SortingState>([])

  const sort = sorting[0]
  const sortBy = sort && SORTABLE_FIELDS.includes(sort.id as SortableField) ? (sort.id as SortableField) : undefined
  const sortDir = sort?.desc ? "desc" : "asc"

  const usersQuery = useQuery({
    queryKey: ["ops-platform-users", type, { search, page, pageSize, sortBy, sortDir }],
    queryFn: () =>
      client.users.list({
        type,
        query: search || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
  })
  const users = usersQuery.data?.users ?? []
  const total = usersQuery.data?.total ?? 0
  const loading = usersQuery.isLoading
  const error = usersQuery.isError ? formatApiError(usersQuery.error) : null

  useEffect(() => {
    setPage(1)
  }, [search, pageSize, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const selection = useRowSelection(users, [type, page, pageSize, sortBy, sortDir, search])
  const title = type === "customers" ? "Customers" : "Drivers"
  const exportRows = (format: ExportFormat, rows: PlatformUserDto[], scope: "selected" | null) =>
    void exportTableRows({
      format,
      title: `${title} (users)`,
      scope,
      columns: exportColumnsFor(type),
      rows,
      entity: "admin",
      client,
    })

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TableToolbar
        search={{ value: search, onChange: setSearch, placeholder: "Search by name or email…" }}
        onExport={(format) => exportRows(format, users, null)}
        exportDisabled={!users.length}
      />

      <BulkBar
        count={selection.count}
        onExport={(format) => exportRows(format, selection.selectedRows, "selected")}
        onClear={selection.clear}
      />

      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <UsersTableSkeleton />
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No users found.</div>
          ) : (
            <DataTable
              columns={[selection.selectColumn, ...columns]}
              data={users}
              sorting={sorting}
              onSortingChange={setSorting}
              getRowId={(user) => user.id}
            />
          )}
        </CardContent>
      </Card>

      {!loading && !error && users.length > 0 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  )
}
