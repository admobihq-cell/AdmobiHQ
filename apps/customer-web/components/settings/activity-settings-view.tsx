"use client"

import { useAuth } from "@clerk/nextjs"
import { useInfiniteQuery } from "@tanstack/react-query"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { listOrgActivity } from "@/lib/org-client"

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return { getToken: async () => null as string | null, isLoaded: true }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

const ACTIVITY_KEY = ["customer-org-activity"] as const

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

export function ActivitySettingsView() {
  const { getToken, isLoaded } = useAuthIfEnabled()

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
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (query.isError) {
    const status = (query.error as Error & { status?: number }).status
    if (status === 403) {
      return (
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="text-lg font-medium">Activity</h2>
            <p className="text-sm text-muted-foreground">
              Activity is available to admins and managers. Ask an admin if you need access.
            </p>
          </CardContent>
        </Card>
      )
    }
    return <p className="text-sm text-destructive">{(query.error as Error).message}</p>
  }

  const items = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Activity</h2>
        <p className="text-sm text-muted-foreground">
          Campaign decisions, team changes, and edits in your organization.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No activity yet. It&apos;ll show up as your team creates campaigns and Admobi reviews
            them.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{item.label}</p>
                <time className="text-xs text-muted-foreground">{formatWhen(item.createdAt)}</time>
              </div>
              <p className="text-xs text-muted-foreground">{item.actorLabel}</p>
              {item.detail ? <p className="text-sm text-muted-foreground">{item.detail}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Load more
        </Button>
      ) : null}
    </div>
  )
}
