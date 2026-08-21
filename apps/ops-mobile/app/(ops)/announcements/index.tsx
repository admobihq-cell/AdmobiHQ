import { useMemo, useState } from "react"
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AnnouncementDto } from "@workspace/ops-contracts"
import { describeAnnouncementTargets, formatLabel, formatRelativeTime } from "@workspace/ops-contracts"

import { Inbox, Plus, Radio, RefreshCcw, Trash } from "@/components/icons"
import { StatusChip } from "@/components/app/status-chip"
import { SkeletonListRows } from "@/components/app/skeleton"
import { PageHero } from "@/components/ui/page-hero"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import {
  radius,
  spacing,
  typography,
  useResolvedTheme,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

export default function AnnouncementsScreen() {
  usePageHeader("Announcements")
  const client = useOpsClient()
  const router = useRouter()
  const colors = useThemeColors()
  const resolvedTheme = useResolvedTheme()
  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    headerTop: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: spacing.xs,
    },
    grouped: {
      marginHorizontal: spacing.lg,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      overflow: "hidden" as const,
    },
    list: { paddingBottom: spacing.xl, flexGrow: 1 },
    rowWrapper: {
      marginHorizontal: spacing.lg,
      backgroundColor: c.surface,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    rowFirst: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    rowLast: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
      marginBottom: spacing.md,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 16,
    },
    itemRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: spacing.sm,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
    },
    itemContent: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    itemTitle: {
      ...typography.headline,
      fontSize: 16,
      color: c.text,
    },
    itemMetaRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    itemMeta: {
      ...typography.caption,
      color: c.mutedForeground,
      flexShrink: 1,
    },
    rowActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      paddingTop: 2,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }))

  const queryClient = useQueryClient()
  const [resendTarget, setResendTarget] = useState<AnnouncementDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDto | null>(null)

  const query = useInfiniteQuery({
    queryKey: ["announcements", "list"],
    queryFn: ({ pageParam }) =>
      client.notifications.list({ page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )
  const error = query.isError ? formatOpsError(query.error, API_URL) : null
  const loading = query.isPending
  const refreshing = query.isRefetching && !query.isFetchingNextPage

  const onRefresh = () => void query.refetch()

  const onEndReached = () => {
    if (!query.isFetchingNextPage && query.hasNextPage) void query.fetchNextPage()
  }

  const resendMutation = useMutation({
    mutationFn: (target: AnnouncementDto) =>
      client.notifications.broadcast({
        title: target.title,
        body: target.body,
        category: (target.category ?? "announcement") as
          "announcement" | "campaign" | "billing" | "promo" | "system",
        target_apps: target.target_apps as ("customer-mobile" | "driver-mobile")[],
      }),
    onSuccess: () => {
      setResendTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["announcements", "list"] })
    },
    onError: () => setResendTarget(null),
  })
  const handleResend = () => {
    if (!resendTarget) return
    resendMutation.mutate(resendTarget)
  }
  const resending = resendMutation.isPending

  const deleteMutation = useMutation({
    mutationFn: (target: AnnouncementDto) => client.notifications.delete(target.id),
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["announcements", "list"] })
    },
    onError: () => setDeleteTarget(null),
  })
  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget)
  }
  const deleting = deleteMutation.isPending

  const listHeader = (
    <View style={[styles.header, { paddingTop: spacing.md }]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <PageHero
            icon={Radio}
            title="Announcements"
            compact
            description="Broadcast a message to the customer and/or driver app."
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push("/(ops)/announcements/new")}
          accessibilityLabel="New announcement"
        >
          <Plus color={colors.primaryForeground} size={22} strokeWidth={2.5} />
        </Pressable>
      </View>
      {error ? (
        <ApiErrorBanner
          message={error}
          onRetry={onRefresh}
          onDismiss={() => setError(null)}
        />
      ) : null}
    </View>
  )

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        {listHeader}
        <View style={styles.grouped}>
          <SkeletonListRows count={6} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        extraData={resolvedTheme}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon={Inbox}
              title="Couldn't load announcements"
              description="Check your connection and try again."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="No announcements yet"
              description="Sent broadcasts will appear here."
            />
          )
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.rowWrapper,
              index === 0 && styles.rowFirst,
              index === items.length - 1 && styles.rowLast,
            ]}
          >
            <View style={styles.itemRow}>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.itemMetaRow}>
                  <StatusChip
                    label={item.deleted_at ? "Deleted" : formatLabel(item.status)}
                    variant={item.deleted_at ? "attention" : "muted"}
                  />
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {`${item.category ?? "announcement"} · ${describeAnnouncementTargets(item.target_apps)} · ${item.delivered_count}/${item.target_count} delivered · ${formatRelativeTime(item.created_at)}`}
                  </Text>
                </View>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setResendTarget(item)}
                  disabled={resending}
                  accessibilityLabel={`Resend ${item.title}`}
                  hitSlop={8}
                >
                  <RefreshCcw color={colors.primary} size={16} />
                </Pressable>
                {item.deleted_at ? null : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setDeleteTarget(item)}
                    disabled={deleting}
                    accessibilityLabel={`Delete ${item.title}`}
                    hitSlop={8}
                  >
                    <Trash color={colors.mutedForeground} size={16} />
                  </Pressable>
                )}
              </View>
            </View>
            {index < items.length - 1 ? (
              <View style={styles.separator} />
            ) : null}
          </View>
        )}
      />

      <ConfirmDialog
        visible={resendTarget !== null}
        title={
          resendTarget
            ? `Resend to ${describeAnnouncementTargets(resendTarget.target_apps)}?`
            : "Resend?"
        }
        message={
          resendTarget
            ? `This sends "${resendTarget.title}" again as a new push to every installed ${describeAnnouncementTargets(resendTarget.target_apps)} app. This can't be undone.`
            : undefined
        }
        confirmLabel={resending ? "Sending…" : "Resend"}
        destructive
        onConfirm={handleResend}
        onCancel={() => {
          if (!resending) setResendTarget(null)
        }}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Delete this announcement?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be hidden from the customer app. It stays in this list marked as Deleted for audit history.`
            : undefined
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />
    </View>
  )
}
