"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { NotificationBellButton } from "@workspace/ui/components/notification-bell-button"
import { NotificationPeek } from "@workspace/ui/components/notification-peek"
import { unreadCount } from "@workspace/ui/lib/notifications"

import { useDriverNotifications } from "@/lib/use-driver-notifications"

const PEEK_LIMIT = 6

/** Bell dropdown in the header, next to ThemeToggle. Merges application-lifecycle
 * events and Admobi announcements into one short peek; the full history lives at
 * /notifications. Refetches on focus rather than polling — a 60s interval kept
 * Neon compute from suspending. */
export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const notifications = useDriverNotifications({ limit: PEEK_LIMIT })

  const items = notifications.items.slice(0, PEEK_LIMIT)
  const unread = unreadCount(items)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <NotificationBellButton unreadCount={unread} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80 p-0">
        <NotificationPeek
          items={items}
          unread={unread}
          isLoading={notifications.isPending}
          allHref="/notifications"
          linkComponent={Link}
          onMarkAllRead={notifications.markAllRead}
          onNavigate={() => setOpen(false)}
          onItemClick={(item) => {
            if (!item.readAt) notifications.markRead(item.id)
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
