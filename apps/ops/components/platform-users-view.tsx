"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import type { PlatformUserDto, PlatformUserType } from "@workspace/ops-contracts"

import { formatApiError } from "@workspace/ops-api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const PAGE_SIZE = 25

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

export function PlatformUsersView({ type }: { type: PlatformUserType }) {
  const client = useOpsClient()

  const [users, setUsers] = useState<PlatformUserDto[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSeq = useRef(0)

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      const seq = ++fetchSeq.current
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const result = await client.users.list({
          type,
          query: search || undefined,
          limit: PAGE_SIZE,
          offset,
        })
        if (seq !== fetchSeq.current) return
        setUsers((prev) => (append ? [...prev, ...result.users] : result.users))
        setTotal(result.total)
        setHasMore(result.hasMore)
      } catch (err) {
        if (seq !== fetchSeq.current) return
        setError(formatApiError(err))
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [client, type, search],
  )

  useEffect(() => {
    void fetchPage(0, false)
  }, [fetchPage])

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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && !error && users.length > 0 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {users.length} of {total}
          </span>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={loadingMore}
              loadingText="Loading…"
              onClick={() => void fetchPage(users.length, true)}
            >
              Load more
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
