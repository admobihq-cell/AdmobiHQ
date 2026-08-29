"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/nextjs"
import { Bell } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  fetchCustomerAnnouncements,
  markCustomerAnnouncementsRead,
  type CustomerAnnouncementDto,
} from "@/lib/announcements-client"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return { getToken: async () => null }
}

/** Same "pick the hook once at module load" pattern as app-shell.tsx's
 * useUserIfEnabled — useAuth() must never run unless ClerkProvider is
 * mounted. This bell is also only rendered behind isAuthEnabled() at its
 * call site in app-shell.tsx, but guarding the hook itself here means the
 * component stays safe even if something renders it unconditionally later. */
const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

export function NotificationBell() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const notificationsQuery = useQuery({
    queryKey: ["customer-announcements"],
    queryFn: async () => {
      try {
        return await fetchCustomerAnnouncements(getToken)
      } catch {
        return []
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })
  const notifications = notificationsQuery.data ?? []

  const markReadMutation = useMutation({
    mutationFn: () => markCustomerAnnouncementsRead(getToken),
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unreadCount > 0) {
      const readAt = new Date().toISOString()
      queryClient.setQueryData<CustomerAnnouncementDto[]>(["customer-announcements"], (prev) =>
        prev?.map((n) => ({ ...n, read_at: n.read_at ?? readAt })) ?? prev,
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
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
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
