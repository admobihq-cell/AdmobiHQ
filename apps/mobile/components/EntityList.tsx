import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Inbox, Search } from "@/components/icons"
import type { PaginatedResponse } from "@workspace/ops-contracts"
import { formatDateTime } from "@workspace/ops-contracts"

import { FilterChips, type FilterChipOption } from "@/components/app/filter-chips"
import { ListRow } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import { PageHero } from "@/components/ui/page-hero"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { colors, radius, spacing, typography } from "@/lib/theme"

type EntityListProps<T extends { id: number }> = {
  title: string
  description?: string
  eyebrow?: string
  loadPage: (page: number) => Promise<PaginatedResponse<T>>
  getTitle: (item: T) => string
  getSubtitle?: (item: T) => string
  getInitials?: (item: T) => string
  getFilterValue?: (item: T) => string | null | undefined
  filterOptions?: FilterChipOption[]
  detailHref: (id: number) => string
  searchKeys?: Array<(item: T) => string | null | undefined>
}

export function EntityList<T extends { id: number; created_at?: string }>({
  title,
  description,
  eyebrow = "Operations",
  loadPage,
  getTitle,
  getSubtitle,
  getInitials,
  getFilterValue,
  filterOptions,
  detailHref,
  searchKeys,
}: EntityListProps<T>) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string | null>(null)

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
        setError(formatOpsError(err, API_URL))
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

  const filteredItems = useMemo(() => {
    let result = items

    if (filter && getFilterValue) {
      result = result.filter((item) => getFilterValue(item) === filter)
    }

    if (search.trim() && searchKeys?.length) {
      const query = search.trim().toLowerCase()
      result = result.filter((item) =>
        searchKeys.some((keyFn) =>
          (keyFn(item) ?? "").toLowerCase().includes(query),
        ),
      )
    }

    return result
  }, [items, filter, search, getFilterValue, searchKeys])

  const listHeader = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        compact
        description={
          description ?? "Search, filter, and tap a row to view details."
        }
      />
      <View style={styles.searchBox}>
        <Search color={colors.mutedForeground} size={18} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      {filterOptions?.length ? (
        <FilterChips
          options={filterOptions}
          selected={filter}
          onSelect={setFilter}
          embedded
        />
      ) : null}
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
        data={filteredItems}
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
              title="Couldn't load records"
              description="Check your connection and try again."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="No records yet"
              description="New submissions will appear here."
            />
          )
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.rowWrapper,
              index === 0 && styles.rowFirst,
              index === filteredItems.length - 1 && styles.rowLast,
            ]}
          >
            <ListRow
              title={getTitle(item)}
              subtitle={getSubtitle?.(item)}
              meta={
                item.created_at ? formatDateTime(item.created_at) : undefined
              }
              initials={getInitials?.(item) ?? getTitle(item)}
              onPress={() => router.push(detailHref(item.id) as never)}
            />
            {index < filteredItems.length - 1 ? (
              <View style={styles.separator} />
            ) : null}
          </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 10,
  },
  grouped: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  list: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  rowWrapper: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
    backgroundColor: colors.border,
    marginLeft: 68,
  },
})
