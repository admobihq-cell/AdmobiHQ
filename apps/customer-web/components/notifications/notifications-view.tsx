"use client"

import { useMemo } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"

import { NotificationFeed } from "@workspace/ui/components/notification-feed"
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

export function NotificationsView() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchCustomerAnnouncements(getToken, { cursor: pageParam, limit: 25 }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_cursor,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const items = useMemo<NotificationFeedItem[]>(
    () =>
      (query.data?.pages ?? [])
        .flatMap((page) => page.items)
        .map(announcementToFeedItem),
    [query.data],
  )

  function patchCache(id: number, read: boolean) {
    const readAt = read ? new Date().toISOString() : null
    queryClient.setQueryData<InfiniteData<CustomerAnnouncementPage>>(
      QUERY_KEY,
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
    mutationFn: ({ id, read }: { id: number; read: boolean }) =>
      setCustomerAnnouncementRead(getToken, id, read),
    onMutate: ({ id, read }) => patchCache(id, read),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-announcements"] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => markCustomerAnnouncementsRead(getToken),
    onMutate: () => {
      const readAt = new Date().toISOString()
      queryClient.setQueryData<InfiniteData<CustomerAnnouncementPage>>(
        QUERY_KEY,
        (data) =>
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
            : data,
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-announcements"] })
    },
  })

  function toRead(feedId: string, read: boolean) {
    const id = announcementIdFromFeedItem(feedId)
    if (id != null) setReadMutation.mutate({ id, read })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Announcements and account updates from the Admobi team, newest first.
        </p>
      </div>

      <NotificationFeed
        className="max-w-2xl"
        items={items}
        isLoading={query.isPending}
        isFetchingMore={query.isFetchingNextPage}
        hasMore={Boolean(query.hasNextPage)}
        onLoadMore={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage()
          }
        }}
        onMarkRead={(item) => toRead(item.id, true)}
        onMarkUnread={(item) => toRead(item.id, false)}
        onMarkAllRead={() => markAllMutation.mutate()}
        emptyTitle="No notifications yet"
        emptyDescription="Announcements from the Admobi team will show up here."
      />
    </div>
  )
}
