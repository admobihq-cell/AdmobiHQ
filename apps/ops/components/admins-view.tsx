"use client"

import { useEffect, useState } from "react"
import type { TeamDto } from "@workspace/ops-contracts"

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

/** Read-only view of the ops org roster — same data as /team (see
 * components/team-view.tsx), without the invite/remove/role-edit controls,
 * which stay exclusive to /team. */
export function AdminsView() {
  const client = useOpsClient()
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.team
      .list()
      .then(setTeam)
      .catch((err) => setError(formatApiError(err)))
  }, [client])

  return (
    <Card className="overflow-hidden p-0 shadow-none">
      <CardContent className="p-0">
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : team === null ? (
          <MembersTableSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(member.joinedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
