"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import type { DriverNotificationDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  fetchDriverAnnouncements,
  fetchDriverNotifications,
  markDriverAnnouncementsRead,
  markDriverNotificationsRead,
  type DriverAnnouncementDto,
} from "@/lib/driver-notifications-client"

const TYPE_DOT: Record<string, string> = {
  application_submitted: "bg-amber-500",
  application_approved: "bg-emerald-500",
  application_rejected: "bg-red-500",
  application_changes_requested: "bg-orange-500",
  announcement: "bg-blue-500",
}

/** Bell dropdown in the header, next to ThemeToggle. Refetches on focus
 * rather than polling — a 60s interval kept Neon compute from suspending.
 * Opening the dropdown marks everything read. */
export function NotificationBell() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const notificationsQuery = useQuery({
    queryKey: ["driver-notifications"],
    queryFn: async () => {
      try {
        return await fetchDriverNotifications(getToken)
      } catch {
        return []
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })
  const announcementsQuery = useQuery({
    queryKey: ["driver-announcements"],
    queryFn: async () => {
      try {
        return await fetchDriverAnnouncements(getToken)
      } catch {
        return []
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  const merged = [
    ...(notificationsQuery.data ?? []).map((n) => ({ ...n, id: `lifecycle-${n.id}` })),
    ...(announcementsQuery.data ?? []).map((a) => ({
      ...a,
      id: `announcement-${a.id}`,
      type: "announcement" as const,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const notifications = merged

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([markDriverNotificationsRead(getToken), markDriverAnnouncementsRead(getToken)])
    },
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unreadCount > 0) {
      const readAt = new Date().toISOString()
      queryClient.setQueryData<DriverNotificationDto[]>(["driver-notifications"], (prev) =>
        prev?.map((n) => ({ ...n, read_at: n.read_at ?? readAt })) ?? prev,
      )
      queryClient.setQueryData<DriverAnnouncementDto[]>(["driver-announcements"], (prev) =>
        prev?.map((a) => ({ ...a, read_at: a.read_at ?? readAt })) ?? prev,
      )
      markReadMutation.mutate()
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up
          </p>
        ) : (
          <div className="-mx-1 max-h-80 space-y-0.5 overflow-y-auto px-1">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex gap-2 rounded-md px-1 py-2 text-sm">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    TYPE_DOT[notification.type] ?? "bg-muted-foreground",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.body}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
