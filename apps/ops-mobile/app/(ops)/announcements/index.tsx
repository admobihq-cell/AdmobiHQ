import { useCallback, useEffect, useState } from "react"
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import type { AnnouncementDto } from "@workspace/ops-contracts"
import { formatLabel, formatRelativeTime } from "@workspace/ops-contracts"

import { Inbox, Plus, RefreshCcw, Trash } from "@/components/icons"
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
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

export default function AnnouncementsScreen() {
  usePageHeader("Announcements")
  const client = useOpsClient()
  const router = useRouter()
  const colors = useThemeColors()
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

  const [items, setItems] = useState<AnnouncementDto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendTarget, setResendTarget] = useState<AnnouncementDto | null>(null)
  const [resending, setResending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      try {
        setError(null)
        const result = await client.notifications.list({
          page: nextPage,
          pageSize: 20,
        })
        setItems((current) =>
          replace ? result.items : [...current, ...result.items]
        )
        setPage(result.page)
        setTotalPages(result.totalPages)
      } catch (err) {
        setError(formatOpsError(err, API_URL))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [client]
  )

  useEffect(() => {
    setLoading(true)
    void fetchPage(1, true)
  }, [fetchPage])

  const onRefresh = () => {
    setRefreshing(true)
    void fetchPage(1, true)
  }

  const onEndReached = () => {
    if (loading || refreshing || page >= totalPages) return
    setLoading(true)
    void fetchPage(page + 1)
  }

  const handleResend = async () => {
    if (!resendTarget || resending) return
    setResending(true)
    try {
      await client.notifications.broadcast({
        title: resendTarget.title,
        body: resendTarget.body,
        category: (resendTarget.category ?? "announcement") as
          "announcement" | "campaign" | "billing" | "promo" | "system",
      })
      setResendTarget(null)
      setRefreshing(true)
      await fetchPage(1, true)
    } catch (err) {
      setError(formatOpsError(err, API_URL))
      setResendTarget(null)
    } finally {
      setResending(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await client.notifications.delete(deleteTarget.id)
      const deletedAt = new Date().toISOString()
      setDeleteTarget(null)
      setItems((current) =>
        current.map((item) =>
          item.id === deleteTarget.id ? { ...item, deleted_at: deletedAt } : item,
        ),
      )
    } catch (err) {
      setError(formatOpsError(err, API_URL))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const listHeader = (
    <View style={[styles.header, { paddingTop: spacing.md }]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <PageHero
            eyebrow="Operations"
            title="Announcements"
            compact
            description="Broadcast a message to every installed customer app."
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
          onRetry={() => {
            setLoading(true)
            void fetchPage(1, true)
          }}
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
                    {`${item.category ?? "announcement"} · ${item.delivered_count}/${item.target_count} delivered · ${formatRelativeTime(item.created_at)}`}
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
        title="Resend to all customers?"
        message={
          resendTarget
            ? `This sends "${resendTarget.title}" again as a new push to every installed customer app. This can't be undone.`
            : undefined
        }
        confirmLabel={resending ? "Sending…" : "Resend"}
        destructive
        onConfirm={() => void handleResend()}
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
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />
    </View>
  )
}
