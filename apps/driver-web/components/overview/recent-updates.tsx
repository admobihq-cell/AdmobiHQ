"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { formatRelativeTime, useNow } from "@workspace/ui/lib/notifications"
import { cn } from "@workspace/ui/lib/utils"

import { useDriverNotifications } from "@/lib/use-driver-notifications"

const SHOWN = 5

/** The newest real updates (announcements + account events). The bell and /notifications share this cache. */
export function RecentUpdates({ className }: { className?: string }) {
  const { items, isPending } = useDriverNotifications()
  const now = useNow()
  const shown = items.slice(0, SHOWN)

  return (
    <DashboardCard
      title="Updates"
      description="Announcements and news about your account"
      className={className}
      contentClassName="px-0"
      action={
        items.length > 0 ? (
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link href="/notifications">
              See all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isPending ? (
        <div className="space-y-4 px-6" aria-busy="true" aria-label="Loading updates">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="px-6 text-sm text-muted-foreground">
          Nothing new. Announcements from Admobi and news about your account land here.
        </p>
      ) : (
        <ul className="divide-y">
          {shown.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href ?? "/notifications"}
                className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-primary")}
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
    </DashboardCard>
  )
}
