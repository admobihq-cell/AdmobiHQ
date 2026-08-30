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
  fetchDriverAnnouncements,
  fetchDriverNotifications,
  markDriverAnnouncementsRead,
  markDriverNotificationsRead,
  setDriverAnnouncementRead,
  setDriverNotificationRead,
} from "@/lib/driver-notifications-client"
import {
  announcementToFeedItem,
  lifecycleToFeedItem,
  parseFeedId,
} from "@/lib/notifications-map"

const ANNOUNCEMENTS_KEY = ["driver-announcements"] as const
const LIFECYCLE_KEY = ["driver-notifications"] as const

type Options = { limit?: number }

/** Structural view both inbox page shapes satisfy — lets one patcher serve
 * either cache without fighting the discriminated union. */
type AnyInboxPage = {
  items: Array<{ id: number; read_at: string | null }>
  next_cursor: number | null
  unread_count: number
}

/** Drives both the header bell and the /notifications page: two cursor-paginated
 * sources (announcements + application-lifecycle events) merged into one
 * newest-first feed, with optimistic read toggles that keep both caches — and
 * the server-provided unread totals — honest. */
export function useDriverNotifications({ limit = 25 }: Options = {}) {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const announcementsQuery = useInfiniteQuery({
    queryKey: ANNOUNCEMENTS_KEY,
    queryFn: ({ pageParam }) =>
      fetchDriverAnnouncements(getToken, { cursor: pageParam, limit }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const lifecycleQuery = useInfiniteQuery({
    queryKey: LIFECYCLE_KEY,
    queryFn: ({ pageParam }) =>
      fetchDriverNotifications(getToken, { cursor: pageParam, limit }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const items = useMemo<NotificationFeedItem[]>(() => {
    const announcements = (announcementsQuery.data?.pages ?? [])
      .flatMap((page) => page?.items ?? [])
      .map(announcementToFeedItem)
    const lifecycle = (lifecycleQuery.data?.pages ?? [])
      .flatMap((page) => page?.items ?? [])
      .map(lifecycleToFeedItem)
    return [...announcements, ...lifecycle].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [announcementsQuery.data, lifecycleQuery.data])

  const unreadCount =
    (announcementsQuery.data?.pages[0]?.unread_count ?? 0) +
    (lifecycleQuery.data?.pages[0]?.unread_count ?? 0)

  function patch(
    key: typeof ANNOUNCEMENTS_KEY | typeof LIFECYCLE_KEY,
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
      const nextUnread =
        target === "all" && read ? 0 : Math.max(0, base + delta)
      return {
        ...data,
        pages: pages.map((page) => ({ ...page, unread_count: nextUnread })),
      }
    })
  }

  const setReadMutation = useMutation({
    mutationFn: ({ feedId, read }: { feedId: string; read: boolean }) => {
      const parsed = parseFeedId(feedId)
      if (!parsed) return Promise.resolve()
      return parsed.source === "announcement"
        ? setDriverAnnouncementRead(getToken, parsed.id, read)
        : setDriverNotificationRead(getToken, parsed.id, read)
    },
    onMutate: ({ feedId, read }) => {
      const parsed = parseFeedId(feedId)
      if (!parsed) return
      patch(
        parsed.source === "announcement" ? ANNOUNCEMENTS_KEY : LIFECYCLE_KEY,
        parsed.id,
        read,
      )
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () =>
      Promise.all([
        markDriverAnnouncementsRead(getToken),
        markDriverNotificationsRead(getToken),
      ]).then(() => undefined),
    onMutate: () => {
      patch(ANNOUNCEMENTS_KEY, "all", true)
      patch(LIFECYCLE_KEY, "all", true)
    },
  })

  const hasMore =
    Boolean(announcementsQuery.hasNextPage) ||
    Boolean(lifecycleQuery.hasNextPage)

  return {
    items,
    unreadCount,
    isPending: announcementsQuery.isPending || lifecycleQuery.isPending,
    isFetchingMore:
      announcementsQuery.isFetchingNextPage ||
      lifecycleQuery.isFetchingNextPage,
    hasMore,
    loadMore: () => {
      if (
        announcementsQuery.hasNextPage &&
        !announcementsQuery.isFetchingNextPage
      ) {
        void announcementsQuery.fetchNextPage()
      }
      if (lifecycleQuery.hasNextPage && !lifecycleQuery.isFetchingNextPage) {
        void lifecycleQuery.fetchNextPage()
      }
    },
    markRead: (feedId: string) =>
      setReadMutation.mutate({ feedId, read: true }),
    markUnread: (feedId: string) =>
      setReadMutation.mutate({ feedId, read: false }),
    markAllRead: () => markAllMutation.mutate(),
  }
}
