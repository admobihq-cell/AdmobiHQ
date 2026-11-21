"use client"

import { useRouter } from "next/navigation"
import { Volume2, VolumeX } from "lucide-react"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { NotificationFeed } from "@workspace/ui/components/notification-feed"
import { useSoundMuted } from "@workspace/ui/lib/sounds"

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
  const [muted, setMuted] = useSoundMuted()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Notifications"
        actions={
          <Button variant="outline" size="sm" aria-pressed={!muted} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
            {muted ? "Alert sound off" : "Alert sound on"}
          </Button>
        }
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
