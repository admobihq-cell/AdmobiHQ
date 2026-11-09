"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { formatRelativeTime, useNow } from "@workspace/ui/lib/notifications"
import { cn } from "@workspace/ui/lib/utils"

import { useDriverNotifications } from "@/lib/use-driver-notifications"

const SHOWN = 4

/** The newest few real updates (announcements + application events), not
 * invented route activity. The bell and /notifications share this cache. */
export function RecentUpdates() {
  const { items, isPending } = useDriverNotifications()
  const now = useNow()
  const shown = items.slice(0, SHOWN)

  return (
    <section aria-labelledby="recent-updates-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-updates-heading" className="text-lg font-semibold tracking-tight">
          Updates
        </h2>
        {items.length > 0 ? (
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            See all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      {isPending ? (
        <div className="divide-y rounded-2xl border" aria-busy="true" aria-label="Loading updates">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Nothing new. Announcements from Admobi and news about your account land here.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {shown.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href ?? "/notifications"}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={cn("mt-2 size-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-primary")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                    {item.readAt ? null : <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.category} · {formatRelativeTime(item.createdAt, now)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
