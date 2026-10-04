"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { TeamMemberDto } from "@workspace/ops-contracts"

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
import { DataTable, DataTableSortHeader, type ColumnDef, type SortingState } from "@/components/ui/data-table"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

function RoleBadge({ role }: { role: "admin" | "member" }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"}>
      {role === "admin" ? "Admin" : "Member"}
    </Badge>
  )
}

function MembersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const columns: ColumnDef<TeamMemberDto, any>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Email"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Role"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: "joinedAt",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Joined"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{formatDateTime(row.original.joinedAt)}</span>
    ),
  },
]

/** Read-only view of the ops org roster — same data as /team (see
 * components/team-view.tsx), without the invite/remove/role-edit controls,
 * which stay exclusive to /team. */
export function AdminsView() {
  const client = useOpsClient()
  const [sorting, setSorting] = useState<SortingState>([])

  const teamQuery = useQuery({
    queryKey: ["ops-team"],
    queryFn: () => client.team.list(),
  })
  const team = teamQuery.data ?? null
  const error = teamQuery.isError ? formatApiError(teamQuery.error) : null

  return (
    <Card className="overflow-hidden p-0 shadow-none">
      <CardContent className="p-0">
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : team === null ? (
          <MembersTableSkeleton />
        ) : (
          <DataTable
            columns={columns}
            data={team.members}
            manualSorting={false}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(member) => member.userId}
          />
        )}
      </CardContent>
    </Card>
  )
}
