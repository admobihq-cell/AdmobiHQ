import { useMemo, useState } from "react"
import { FlatList, RefreshControl, View } from "react-native"
import { useRouter } from "expo-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { formatDateTime, formatLabel } from "@workspace/ops-contracts"
import type { CampaignListItemDto } from "@workspace/ops-contracts"

import { FilterChips } from "@/components/app/filter-chips"
import { ListRow } from "@/components/app/list-row"
import { SkeletonTriageRows } from "@/components/app/skeleton"
import type { StatusChipVariant } from "@/components/app/status-chip"
import { MonitorPlay } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, useThemeColors, useThemedStyles } from "@/lib/theme"

const STATUS_FILTERS = [
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
]

const STATUS_VARIANTS: Record<string, StatusChipVariant> = {
  submitted: "progress",
  approved: "success",
  rejected: "muted",
  changes_requested: "attention",
  cancelled: "muted",
  draft: "muted",
}

/** Flight window and creative count are what a reviewer triages on, so they
 * go in the row rather than only on the detail screen. */
function subtitleFor(item: CampaignListItemDto): string | undefined {
  const flight = item.starts_on && item.ends_on ? `${item.starts_on} → ${item.ends_on}` : null
  const creatives = `${item.creative_count} creative${item.creative_count === 1 ? "" : "s"}`
  return [item.contact_email, item.market, flight, creatives].filter(Boolean).join(" · ") || undefined
}

export default function CampaignsScreen() {
  usePageHeader("Campaigns")
  const router = useRouter()
  const client = useOpsClient()
  const colors = useThemeColors()
  const [status, setStatus] = useState<string | null>(null)

  const query = useInfiniteQuery({
    queryKey: ["campaigns", "list", status],
    queryFn: ({ pageParam }) =>
      client.campaigns.list({ page: pageParam, status: status ?? undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )
  const error = query.error ? formatOpsError(query.error, API_URL) : null

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
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
    rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, marginBottom: spacing.md },
    separator: { height: 1, backgroundColor: c.border, marginLeft: spacing.md },
  }))

  const listHeader = (
    <View style={styles.header}>
      <PageHero
        icon={MonitorPlay}
        title="Campaigns"
        compact
        description="Review advertiser campaigns and their creative before they run."
      />
      <FilterChips options={STATUS_FILTERS} selected={status} onSelect={setStatus} embedded />
      {error ? (
        <ApiErrorBanner message={error} onRetry={() => void query.refetch()} />
      ) : null}
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
              icon={MonitorPlay}
              title="No campaigns"
              description={status ? "No campaigns with this status." : "Submitted campaigns will appear here."}
            />
          )
        }
        renderItem={({ item, index }: { item: CampaignListItemDto; index: number }) => (
          <View
            style={[
              styles.rowWrapper,
              index === 0 && styles.rowFirst,
              index === items.length - 1 && styles.rowLast,
            ]}
          >
            <ListRow
              title={item.name}
              subtitle={subtitleFor(item)}
              meta={formatDateTime(item.submitted_at ?? item.created_at)}
              initials={item.name}
              statusLabel={formatLabel(item.status)}
              statusVariant={STATUS_VARIANTS[item.status] ?? "muted"}
              onPress={() => router.push(`/(ops)/campaigns/${item.id}`)}
            />
            {index < items.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        )}
      />
    </View>
  )
}
