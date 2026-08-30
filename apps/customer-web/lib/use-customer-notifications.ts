"use client"

import { useMemo } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"

import type { NotificationFeedItem } from "@workspace/ui/lib/notifications"

import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  fetchCustomerAnnouncements,
  markCustomerAnnouncementsRead,
  setCustomerAnnouncementRead,
  type CustomerAnnouncementPage,
} from "@/lib/announcements-client"
import {
  announcementIdFromFeedItem,
  announcementToFeedItem,
} from "@/lib/notifications-map"

const QUERY_KEY = ["customer-notifications"] as const
const PAGE_LIMIT = 25

/** Single source of truth for the header bell and the /notifications page —
 * one cursor-paginated query plus optimistic read toggles that keep the
 * server-provided unread total honest. */
export function useCustomerNotifications() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchCustomerAnnouncements(getToken, {
        cursor: pageParam,
        limit: PAGE_LIMIT,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const items = useMemo<NotificationFeedItem[]>(
    () =>
      (query.data?.pages ?? [])
        .flatMap((page) => page?.items ?? [])
        .map(announcementToFeedItem),
    [query.data],
  )

  const unreadCount = query.data?.pages[0]?.unread_count ?? 0

  function patch(target: "all" | number, read: boolean) {
    const readAt = read ? new Date().toISOString() : null
    queryClient.setQueryData<InfiniteData<CustomerAnnouncementPage>>(
      QUERY_KEY,
      (data) => {
        if (!data) return data
        let delta = 0
        const pages = data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => {
            if (target !== "all" && item.id !== target) return item
            if (read && !item.read_at) delta -= 1
            if (!read && item.read_at) delta += 1
            return { ...item, read_at: readAt }
          }),
        }))
        const base = data.pages[0]?.unread_count ?? 0
        const nextUnread =
          target === "all" && read ? 0 : Math.max(0, base + delta)
        return {
          ...data,
          pages: pages.map((page) => ({ ...page, unread_count: nextUnread })),
        }
      },
    )
  }

  const setReadMutation = useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean }) =>
      setCustomerAnnouncementRead(getToken, id, read),
    onMutate: ({ id, read }) => patch(id, read),
  })

  const markAllMutation = useMutation({
    mutationFn: () => markCustomerAnnouncementsRead(getToken),
    onMutate: () => patch("all", true),
  })

  function toRead(feedId: string, read: boolean) {
    const id = announcementIdFromFeedItem(feedId)
    if (id != null) setReadMutation.mutate({ id, read })
  }

  return {
    items,
    unreadCount,
    isPending: query.isPending,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage()
      }
    },
    markRead: (feedId: string) => toRead(feedId, true),
    markUnread: (feedId: string) => toRead(feedId, false),
    markAllRead: () => markAllMutation.mutate(),
  }
}
