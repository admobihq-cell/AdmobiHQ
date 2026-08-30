"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { NotificationBellButton } from "@workspace/ui/components/notification-bell-button"
import { NotificationPeek } from "@workspace/ui/components/notification-peek"
import { unreadCount } from "@workspace/ui/lib/notifications"

import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  fetchCustomerAnnouncements,
  markCustomerAnnouncementsRead,
  setCustomerAnnouncementRead,
  type CustomerAnnouncementPage,
} from "@/lib/announcements-client"
import { announcementToFeedItem } from "@/lib/notifications-map"

const QUERY_KEY = ["customer-announcements"] as const
const PEEK_LIMIT = 6

export function NotificationBell() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchCustomerAnnouncements(getToken, {
        cursor: pageParam,
        limit: PEEK_LIMIT,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const items = (query.data?.pages ?? [])
    .flatMap((page) => page?.items ?? [])
    .slice(0, PEEK_LIMIT)
    .map(announcementToFeedItem)
  const unread = unreadCount(items)

  function patchCache(updater: (readAt: string) => (id: number) => boolean) {
    const readAt = new Date().toISOString()
    const shouldMark = updater(readAt)
    queryClient.setQueryData<InfiniteData<CustomerAnnouncementPage>>(
      QUERY_KEY,
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  shouldMark(item.id)
                    ? { ...item, read_at: item.read_at ?? readAt }
                    : item,
                ),
              })),
            }
          : data,
    )
  }

  const markAllMutation = useMutation({
    mutationFn: () => markCustomerAnnouncementsRead(getToken),
    onMutate: () => patchCache(() => () => true),
    onSettled: () =>
      void queryClient.invalidateQueries({
        queryKey: ["customer-notifications"],
      }),
  })

  const readOneMutation = useMutation({
    mutationFn: (id: number) => setCustomerAnnouncementRead(getToken, id, true),
    onMutate: (id) => patchCache(() => (candidate) => candidate === id),
    onSettled: () =>
      void queryClient.invalidateQueries({
        queryKey: ["customer-notifications"],
      }),
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <NotificationBellButton unreadCount={unread} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80 p-0">
        <NotificationPeek
          items={items}
          unread={unread}
          isLoading={query.isPending}
          allHref="/notifications"
          linkComponent={Link}
          onMarkAllRead={() => markAllMutation.mutate()}
          onNavigate={() => setOpen(false)}
          onItemClick={(item) => {
            const id = Number(item.id.split(":")[1])
            if (!item.readAt && Number.isFinite(id)) readOneMutation.mutate(id)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
