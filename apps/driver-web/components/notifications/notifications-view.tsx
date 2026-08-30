"use client"

import { useRouter } from "next/navigation"

import { NotificationFeed } from "@workspace/ui/components/notification-feed"

import { useDriverNotifications } from "@/lib/use-driver-notifications"

export function NotificationsView() {
  const router = useRouter()
  const notifications = useDriverNotifications({ limit: 25 })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Application updates and announcements from the Admobi team, newest
          first.
        </p>
      </div>

      <NotificationFeed
        items={notifications.items}
        isLoading={notifications.isPending}
        isFetchingMore={notifications.isFetchingMore}
        hasMore={notifications.hasMore}
        onLoadMore={notifications.loadMore}
        onOpen={(item) => {
          if (item.href) router.push(item.href)
        }}
        onMarkRead={(item) => notifications.markRead(item.id)}
        onMarkUnread={(item) => notifications.markUnread(item.id)}
        onMarkAllRead={notifications.markAllRead}
        emptyTitle="No notifications yet"
        emptyDescription="Application updates and Admobi announcements will show up here."
      />
    </div>
  )
}
