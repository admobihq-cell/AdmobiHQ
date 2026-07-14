import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { ChevronRight, Inbox } from "@/components/icons"
import type { PaginatedResponse } from "@workspace/ops-contracts"
import { formatDateTime } from "@workspace/ops-contracts"

import { EmptyState } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { OPS_URL } from "@/lib/ops-client"
import { colors, radius, spacing, typography } from "@/lib/theme"

type EntityListProps<T extends { id: number }> = {
  title: string
  loadPage: (page: number) => Promise<PaginatedResponse<T>>
  getTitle: (item: T) => string
  getSubtitle?: (item: T) => string
  detailHref: (id: number) => string
}

export function EntityList<T extends { id: number; created_at?: string }>({
  title,
  loadPage,
  getTitle,
  getSubtitle,
  detailHref,
}: EntityListProps<T>) {
  const router = useRouter()
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      try {
        setError(null)
        const result = await loadPage(nextPage)
        setItems((current) =>
          replace ? result.items : [...current, ...result.items],
        )
        setPage(result.page)
        setTotalPages(result.totalPages)
      } catch (err) {
        setError(formatOpsError(err, OPS_URL))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [loadPage],
  )

  useEffect(() => {
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

  if (loading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.headerDescription}>
          Pull down to refresh. Tap a row for details.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
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
          <EmptyState
            icon={Inbox}
            title="No records yet"
            description="New submissions will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(detailHref(item.id) as never)}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{getTitle(item)}</Text>
              {getSubtitle ? (
                <Text style={styles.cardSubtitle}>{getSubtitle(item)}</Text>
              ) : null}
              {item.created_at ? (
                <Text style={styles.cardMeta}>
                  {formatDateTime(item.created_at)}
                </Text>
              ) : null}
            </View>
            <ChevronRight
              color={colors.mutedForeground}
              size={18}
              strokeWidth={2}
            />
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heading: {
    ...typography.title,
    color: colors.text,
  },
  headerDescription: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.accent,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    ...typography.bodySm,
  },
})
