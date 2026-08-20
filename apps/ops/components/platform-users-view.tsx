"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import type { PlatformUserDto, PlatformUserType } from "@workspace/ops-contracts"

import { formatApiError } from "@workspace/ops-api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
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
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const PAGE_SIZE = 25

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

const columns: ColumnDef<PlatformUserDto, any>[] = [
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

export function PlatformUsersView({ type }: { type: PlatformUserType }) {
  const client = useOpsClient()

  const [users, setUsers] = useState<PlatformUserDto[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sort = sorting[0]
  const sortBy = sort && SORTABLE_FIELDS.includes(sort.id as SortableField) ? (sort.id as SortableField) : undefined
  const sortDir = sort?.desc ? "desc" : "asc"

  const fetchSeq = useRef(0)

  const fetchPage = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setError(null)
    try {
      const result = await client.users.list({
        type,
        query: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sortBy,
        sortDir,
      })
      if (seq !== fetchSeq.current) return
      setUsers(result.users)
      setTotal(result.total)
    } catch (err) {
      if (seq !== fetchSeq.current) return
      setError(formatApiError(err))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, type, search, page, sortBy, sortDir])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
              columns={columns}
              data={users}
              sorting={sorting}
              onSortingChange={setSorting}
              getRowId={(user) => user.id}
            />
          )}
        </CardContent>
      </Card>

      {!loading && !error && users.length > 0 ? (
        <TablePagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      ) : null}
    </div>
  )
}
