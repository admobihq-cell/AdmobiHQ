"use client"

import { useRouter } from "next/navigation"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { NotificationFeed } from "@workspace/ui/components/notification-feed"

import { PageHero } from "@/components/ui/page-hero"
import { useOpsNotifications } from "@/lib/use-ops-notifications"

export function NotificationsView({
  role,
  permissions,
}: {
  role: OpsRole
  permissions: OpsPermission[]
}) {
  const router = useRouter()
  const notifications = useOpsNotifications({ role, permissions })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Notifications"
        description="New submissions and open review work — campaign leads, fleet and driver signups, waitlist and media-kit requests, support cases, and driver applications — newest first, filtered to your permissions. Marking one read clears it from your queue on this device."
      />

      <NotificationFeed
        items={notifications.items}
        isLoading={notifications.isPending}
        onOpen={(item) => {
          if (item.href) router.push(item.href)
        }}
        onMarkRead={(item) => notifications.markRead(item.id)}
        onMarkUnread={(item) => notifications.markUnread(item.id)}
        onMarkAllRead={notifications.markAllRead}
        emptyTitle="Nothing needs attention"
        emptyDescription="New leads, signups, requests, support cases, and driver applications will show up here."
      />
    </div>
  )
}
