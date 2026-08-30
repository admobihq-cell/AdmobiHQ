"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { NotificationBellButton } from "@workspace/ui/components/notification-bell-button"
import { NotificationPeek } from "@workspace/ui/components/notification-peek"
import { unreadCount } from "@workspace/ui/lib/notifications"

import { useOpsNotifications } from "@/lib/use-ops-notifications"

const PEEK_LIMIT = 6

/**
 * Ops's attention queue: submitted driver applications, live support cases, and
 * recent announcements the viewer can see, merged newest-first. The badge is the
 * count of items not yet triaged in this browser; the full list lives at
 * /notifications.
 */
export function NotificationBell({
  role,
  permissions,
}: {
  role: OpsRole
  permissions: OpsPermission[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const notifications = useOpsNotifications({ role, permissions })

  // Count across the whole triage list, not just the peek window.
  const unread = unreadCount(notifications.items)
  const items = notifications.items.slice(0, PEEK_LIMIT)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <NotificationBellButton unreadCount={unread} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-80 min-w-80 flex-col overflow-y-hidden p-0"
      >
        <NotificationPeek
          items={items}
          unread={unread}
          isLoading={notifications.isPending}
          allHref="/notifications"
          linkComponent={Link}
          onMarkAllRead={notifications.markAllRead}
          onNavigate={() => setOpen(false)}
          onItemClick={(item) => {
            notifications.markRead(item.id)
            if (item.href) {
              setOpen(false)
              router.push(item.href)
            }
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
