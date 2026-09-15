import { useInfiniteQuery } from "@tanstack/react-query"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { listOrgActivity } from "@/lib/org-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const ACTIVITY_KEY = ["customer-org-activity"] as const

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

export default function ActivitySettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const getToken = useTokenGetter()

  const query = useInfiniteQuery({
    queryKey: ACTIVITY_KEY,
    queryFn: ({ pageParam }) => listOrgActivity(getToken, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  })

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    row: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 4,
    },
    label: { ...typography.body, fontWeight: "600" as const, color: c.text },
    meta: { ...typography.caption, color: c.mutedForeground },
    detail: { ...typography.body, color: c.mutedForeground },
    empty: { padding: spacing.lg, ...typography.body, color: c.mutedForeground },
    loadMore: {
      margin: spacing.lg,
      paddingVertical: spacing.sm,
      alignItems: "center" as const,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    loadMoreText: { fontWeight: "700" as const, color: c.text },
  }))

  if (query.isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (query.isError) {
    const status = (query.error as Error & { status?: number }).status
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>
          {status === 403
            ? "Activity is available to owners and managers."
            : (query.error as Error).message}
        </Text>
      </View>
    )
  }

  const items = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No activity yet. It will show up as your team creates campaigns and Admobi reviews them.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.meta}>
            {item.actorLabel} · {formatWhen(item.createdAt)}
          </Text>
          {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
        </View>
      )}
      ListFooterComponent={
        query.hasNextPage ? (
          <Pressable style={styles.loadMore} onPress={() => void query.fetchNextPage()}>
            <Text style={styles.loadMoreText}>
              {query.isFetchingNextPage ? "Loading…" : "Load more"}
            </Text>
          </Pressable>
        ) : null
      }
    />
  )
}
