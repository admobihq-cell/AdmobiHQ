"use client"

import { NotificationFeed } from "@workspace/ui/components/notification-feed"

import { useCustomerNotifications } from "@/lib/use-customer-notifications"

export function NotificationsView() {
  const notifications = useCustomerNotifications()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Announcements and account updates from the Admobi team, newest first.
        </p>
      </div>

      <NotificationFeed
        items={notifications.items}
        isLoading={notifications.isPending}
        isFetchingMore={notifications.isFetchingMore}
        hasMore={notifications.hasMore}
        onLoadMore={notifications.loadMore}
        onMarkRead={(item) => notifications.markRead(item.id)}
        onMarkUnread={(item) => notifications.markUnread(item.id)}
        onMarkAllRead={notifications.markAllRead}
        emptyTitle="No notifications yet"
        emptyDescription="Announcements from the Admobi team will show up here."
      />
    </div>
  )
}
