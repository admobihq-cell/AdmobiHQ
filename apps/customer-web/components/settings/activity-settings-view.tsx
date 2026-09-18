"use client"

import { useAuth } from "@clerk/nextjs"
import { useInfiniteQuery } from "@tanstack/react-query"
import { History, RefreshCw } from "lucide-react"

import { formatLabel } from "@workspace/ops-contracts"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { ActivityTableSkeleton } from "@/components/skeletons/activity-table-skeleton"
import { listOrgActivity } from "@/lib/org-client"

const ACTIVITY_KEY = ["customer-org-activity"] as const

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function Header({ action }: { action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Activity</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Campaign decisions, team changes, and edits in your organization.
        </p>
      </div>
      {action}
    </div>
  )
}

export function ActivitySettingsView() {
  const { getToken, isLoaded } = useAuth()

  const query = useInfiniteQuery({
    queryKey: ACTIVITY_KEY,
    queryFn: ({ pageParam }) =>
      listOrgActivity(getToken, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isLoaded,
    retry: false,
  })

  if (!isLoaded || query.isLoading) {
    return <ActivityTableSkeleton />
  }

  if (query.isError) {
    const status = (query.error as Error & { status?: number }).status
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div className="overflow-hidden rounded-xl border bg-card shadow-none">
          <div className="flex h-32 flex-col items-center justify-center px-6 text-center">
            <History className="mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {status === 403
                ? "Activity is limited to admins and managers."
                : "Couldn't load activity."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === 403
                ? "Ask an admin if you need access."
                : (query.error as Error).message}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const items = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="flex flex-col gap-6">
      <Header
        action={
          <Button
            variant="outline"
            size="sm"
            disabled={query.isRefetching}
            loading={query.isRefetching}
            loadingText="Refresh"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center px-6 text-center">
            <History className="mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No activity yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              It&apos;ll show up as your team creates campaigns and Admobi reviews them.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">When</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="w-48">Actor</TableHead>
                <TableHead className="w-40">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap align-top text-muted-foreground">
                    {formatWhen(item.createdAt)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{item.label}</span>
                      {item.detail ? (
                        <span className="max-w-md whitespace-normal break-words text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {item.actorLabel}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="secondary">{formatLabel(item.entityType)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="self-start"
          disabled={query.isFetchingNextPage}
          loading={query.isFetchingNextPage}
          loadingText="Loading…"
          onClick={() => void query.fetchNextPage()}
        >
          Load more
        </Button>
      ) : null}
    </div>
  )
}
