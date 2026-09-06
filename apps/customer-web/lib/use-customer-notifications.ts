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
  fetchCustomerNotifications,
  markCustomerNotificationsRead,
  setCustomerNotificationRead,
  type CustomerNotificationPage,
} from "@/lib/customer-notifications-client"
import {
  announcementToFeedItem,
  campaignNotificationToFeedItem,
  parseFeedId,
} from "@/lib/notifications-map"

const ANNOUNCEMENTS_KEY = ["customer-announcements"] as const
const CAMPAIGNS_KEY = ["customer-notifications"] as const
const PAGE_LIMIT = 25

/** Both feeds share this shape, which is what lets one `patch` helper below
 * update either cache. */
type AnyInboxPage = {
  items: { id: number; read_at: string | null }[]
  next_cursor: number | null
  unread_count: number
}

/**
 * Single source of truth for the header bell and the /notifications page.
 *
 * Two sources merged client-side — ops announcements and campaign lifecycle
 * events — because they live in different tables with different lifetimes. The
 * driver apps do exactly this (see driver-web/lib/use-driver-notifications.ts);
 * this is that pattern applied to advertisers.
 */
export function useCustomerNotifications() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const announcementsQuery = useInfiniteQuery({
    queryKey: ANNOUNCEMENTS_KEY,
    queryFn: ({ pageParam }) =>
      fetchCustomerAnnouncements(getToken, { cursor: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const campaignsQuery = useInfiniteQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: ({ pageParam }) =>
      fetchCustomerNotifications(getToken, { cursor: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const items = useMemo<NotificationFeedItem[]>(() => {
    const announcements = (announcementsQuery.data?.pages ?? [])
      .flatMap((page) => page?.items ?? [])
      .map(announcementToFeedItem)
    const campaigns = (campaignsQuery.data?.pages ?? [])
      .flatMap((page) => page?.items ?? [])
      .map(campaignNotificationToFeedItem)
    return [...announcements, ...campaigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [announcementsQuery.data, campaignsQuery.data])

  const unreadCount =
    (announcementsQuery.data?.pages[0]?.unread_count ?? 0) +
    (campaignsQuery.data?.pages[0]?.unread_count ?? 0)

  function patch(
    key: typeof ANNOUNCEMENTS_KEY | typeof CAMPAIGNS_KEY,
    target: "all" | number,
    read: boolean,
  ) {
    const readAt = read ? new Date().toISOString() : null
    queryClient.setQueryData<InfiniteData<AnyInboxPage>>(key, (data) => {
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
      const nextUnread = target === "all" && read ? 0 : Math.max(0, base + delta)
      return { ...data, pages: pages.map((page) => ({ ...page, unread_count: nextUnread })) }
    })
  }

  const setReadMutation = useMutation({
    mutationFn: ({ feedId, read }: { feedId: string; read: boolean }) => {
      const parsed = parseFeedId(feedId)
      if (!parsed) return Promise.resolve()
      return parsed.source === "announcement"
        ? setCustomerAnnouncementRead(getToken, parsed.id, read)
        : setCustomerNotificationRead(getToken, parsed.id, read)
    },
    onMutate: ({ feedId, read }) => {
      const parsed = parseFeedId(feedId)
      if (!parsed) return
      patch(parsed.source === "announcement" ? ANNOUNCEMENTS_KEY : CAMPAIGNS_KEY, parsed.id, read)
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () =>
      Promise.all([
        markCustomerAnnouncementsRead(getToken),
        markCustomerNotificationsRead(getToken),
      ]).then(() => undefined),
    onMutate: () => {
      patch(ANNOUNCEMENTS_KEY, "all", true)
      patch(CAMPAIGNS_KEY, "all", true)
    },
  })

  return {
    items,
    unreadCount,
    isPending: announcementsQuery.isPending || campaignsQuery.isPending,
    isFetchingMore:
      announcementsQuery.isFetchingNextPage || campaignsQuery.isFetchingNextPage,
    hasMore: Boolean(announcementsQuery.hasNextPage) || Boolean(campaignsQuery.hasNextPage),
    loadMore: () => {
      if (announcementsQuery.hasNextPage && !announcementsQuery.isFetchingNextPage) {
        void announcementsQuery.fetchNextPage()
      }
      if (campaignsQuery.hasNextPage && !campaignsQuery.isFetchingNextPage) {
        void campaignsQuery.fetchNextPage()
      }
    },
    markRead: (feedId: string) => setReadMutation.mutate({ feedId, read: true }),
    markUnread: (feedId: string) => setReadMutation.mutate({ feedId, read: false }),
    markAllRead: () => markAllMutation.mutate(),
  }
}

export type { CustomerAnnouncementPage, CustomerNotificationPage }
