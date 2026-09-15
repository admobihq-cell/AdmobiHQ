import { useMemo } from "react"
import { FlatList, RefreshControl, View } from "react-native"
import { useRouter } from "expo-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { formatDateTime } from "@workspace/ops-contracts"
import type { OpsAdvertiserOrgListItemDto } from "@workspace/ops-contracts"

import { ListRow } from "@/components/app/list-row"
import { SkeletonTriageRows } from "@/components/app/skeleton"
import { Users } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, useThemeColors, useThemedStyles } from "@/lib/theme"

function subtitleFor(item: OpsAdvertiserOrgListItemDto): string {
  return [
    `${item.memberCount} member${item.memberCount === 1 ? "" : "s"}`,
    `${item.campaignCount} campaign${item.campaignCount === 1 ? "" : "s"}`,
  ].join(" · ")
}

export default function AdvertiserOrgsScreen() {
  usePageHeader("Advertiser orgs")
  const router = useRouter()
  const client = useOpsClient()
  const colors = useThemeColors()

  const query = useInfiniteQuery({
    queryKey: ["advertiser-orgs", "list"],
    queryFn: ({ pageParam }) => client.advertiserOrgs.list({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  const error = query.error ? formatOpsError(query.error, API_URL) : null

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    list: { paddingBottom: spacing.xl },
    grouped: {
      marginHorizontal: spacing.lg,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      overflow: "hidden" as const,
    },
    rowWrapper: {
      marginHorizontal: spacing.lg,
      backgroundColor: c.surface,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: c.border,
    },
    rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
    rowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
      marginBottom: spacing.md,
    },
    separator: { height: 1, backgroundColor: c.border, marginLeft: spacing.md },
  }))

  const listHeader = (
    <View style={styles.header}>
      <PageHero
        icon={Users}
        title="Advertiser orgs"
        compact
        description="Who's on each advertiser account, and what they're running."
      />
      {error ? <ApiErrorBanner message={error} onRetry={() => void query.refetch()} /> : null}
    </View>
  )

  if (query.isPending) {
    return (
      <View style={styles.container}>
        {listHeader}
        <View style={styles.grouped}>
          <SkeletonTriageRows count={6} />
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
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (!query.isFetchingNextPage && query.hasNextPage) void query.fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          error ? null : (
            <EmptyState
              icon={Users}
              title="No advertiser organizations"
              description="Every advertiser gets one on their first sign-in."
            />
          )
        }
        renderItem={({ item, index }: { item: OpsAdvertiserOrgListItemDto; index: number }) => (
          <View
            style={[
              styles.rowWrapper,
              index === 0 && styles.rowFirst,
              index === items.length - 1 && styles.rowLast,
            ]}
          >
            <ListRow
              title={item.name || "Unnamed organization"}
              subtitle={subtitleFor(item)}
              meta={formatDateTime(item.createdAt)}
              initials={item.name || "?"}
              onPress={() => router.push(`/(ops)/advertiser-orgs/${item.id}`)}
            />
            {index < items.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        )}
      />
    </View>
  )
}
