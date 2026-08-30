"use client"

import { useState } from "react"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { NotificationBellButton } from "@workspace/ui/components/notification-bell-button"
import { NotificationPeek } from "@workspace/ui/components/notification-peek"

import { useCustomerNotifications } from "@/lib/use-customer-notifications"

const PEEK_LIMIT = 6

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const notifications = useCustomerNotifications()

  const items = notifications.items.slice(0, PEEK_LIMIT)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <NotificationBellButton unreadCount={notifications.unreadCount} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-80 min-w-80 flex-col overflow-y-hidden p-0"
      >
        <NotificationPeek
          items={items}
          unread={notifications.unreadCount}
          isLoading={notifications.isPending}
          allHref="/notifications"
          linkComponent={Link}
          onMarkAllRead={notifications.markAllRead}
          onNavigate={() => setOpen(false)}
          onItemClick={(item) => {
            if (!item.readAt) notifications.markRead(item.id)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
