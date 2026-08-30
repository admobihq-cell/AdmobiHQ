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
  type DriverAnnouncementPage,
  type DriverNotificationPage,
} from "@/lib/driver-notifications-client"
import {
  announcementToFeedItem,
  lifecycleToFeedItem,
  parseFeedId,
} from "@/lib/notifications-map"

const ANNOUNCEMENTS_KEY = ["driver-announcements"] as const
const LIFECYCLE_KEY = ["driver-notifications"] as const

type Options = { limit?: number }

/** Drives both the header bell and the /notifications page: two cursor-paginated
 * sources (announcements + application-lifecycle events) merged into one
 * newest-first feed, with optimistic read toggles that keep both caches honest. */
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

  function patchAnnouncement(id: number, read: boolean) {
    const readAt = read ? new Date().toISOString() : null
    queryClient.setQueryData<InfiniteData<DriverAnnouncementPage>>(
      ANNOUNCEMENTS_KEY,
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === id ? { ...item, read_at: readAt } : item,
                ),
              })),
            }
          : data,
    )
  }

  function patchLifecycle(id: number, read: boolean) {
    const readAt = read ? new Date().toISOString() : null
    queryClient.setQueryData<InfiniteData<DriverNotificationPage>>(
      LIFECYCLE_KEY,
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === id ? { ...item, read_at: readAt } : item,
                ),
              })),
            }
          : data,
    )
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
      if (parsed.source === "announcement") patchAnnouncement(parsed.id, read)
      else patchLifecycle(parsed.id, read)
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () =>
      Promise.all([
        markDriverAnnouncementsRead(getToken),
        markDriverNotificationsRead(getToken),
      ]).then(() => undefined),
    onMutate: () => {
      const readAt = new Date().toISOString()
      const markAll = <T extends DriverAnnouncementPage | DriverNotificationPage>(
        data: InfiniteData<T> | undefined,
      ) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) => ({
                  ...item,
                  read_at: item.read_at ?? readAt,
                })),
              })),
            }
          : data
      queryClient.setQueryData<InfiniteData<DriverAnnouncementPage>>(
        ANNOUNCEMENTS_KEY,
        markAll,
      )
      queryClient.setQueryData<InfiniteData<DriverNotificationPage>>(
        LIFECYCLE_KEY,
        markAll,
      )
    },
  })

  const hasMore =
    Boolean(announcementsQuery.hasNextPage) ||
    Boolean(lifecycleQuery.hasNextPage)

  return {
    items,
    isPending: announcementsQuery.isPending || lifecycleQuery.isPending,
    isFetchingMore:
      announcementsQuery.isFetchingNextPage ||
      lifecycleQuery.isFetchingNextPage,
    hasMore,
    loadMore: () => {
      if (announcementsQuery.hasNextPage && !announcementsQuery.isFetchingNextPage) {
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
