import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import {
  CheckboxOff,
  CheckboxOn,
  Inbox,
  Plus,
  Search,
} from "@/components/icons"
import type {
  FormFieldOption,
  PaginatedResponse,
} from "@workspace/ops-contracts"
import { formatLabel, formatRelativeTime } from "@workspace/ops-contracts"

import {
  FilterChips,
  type FilterChipOption,
} from "@/components/app/filter-chips"
import { ListRow } from "@/components/app/list-row"
import type { StatusChipVariant } from "@/components/app/status-chip"
import { SkeletonListRows, SkeletonTriageRows } from "@/components/app/skeleton"
import { PageHero } from "@/components/ui/page-hero"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState } from "@/components/ui"
import type { EntityKey } from "@/lib/entity-form-config"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { entityKeys } from "@/lib/query-keys"
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

type EntityListLoadOptions = {
  status?: string | null
  search?: string | null
}

type EntityListProps<T extends { id: number }> = {
  entity: EntityKey
  title: string
  description?: string
  eyebrow?: string
  loadPage: (
    page: number,
    options?: EntityListLoadOptions
  ) => Promise<PaginatedResponse<T>>
  /** Required unless `renderRow` is provided. */
  getTitle?: (item: T) => string
  getSubtitle?: (item: T) => string
  getInitials?: (item: T) => string
  getStatus?: (item: T) => string | null | undefined
  getStatusVariant?: (item: T) => StatusChipVariant
  renderRow?: (
    item: T,
    ctx: { onPress: () => void; index: number }
  ) => ReactNode
  filterOptions?: FilterChipOption[]
  detailHref: (id: number) => string
  addHref?: string
  /** Enables long-list triage: a "Select" toggle, per-row checkboxes, and a bulk status bar. Requires both props together. */
  statusOptions?: FormFieldOption[]
  onBulkStatusChange?: (ids: number[], status: string) => Promise<unknown>
}

const SEARCH_DEBOUNCE_MS = 300

export function EntityList<T extends { id: number; created_at?: string }>({
  entity,
  title,
  description,
  eyebrow = "Operations",
  loadPage,
  getTitle,
  getSubtitle,
  getInitials,
  getStatus,
  getStatusVariant,
  renderRow,
  filterOptions,
  detailHref,
  addHref,
  statusOptions,
  onBulkStatusChange,
}: EntityListProps<T>) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
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
    headerActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    selectToggle: {
      minHeight: 44,
      paddingHorizontal: spacing.md,
      justifyContent: "center" as const,
    },
    selectToggleText: {
      ...typography.body,
      fontWeight: "600" as const,
      color: c.primary,
    },
    bulkBar: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    bulkBarLabel: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    rowInner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    checkbox: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    rowContentFlex: {
      flex: 1,
      minWidth: 0,
    },
    searchBox: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: c.text,
      paddingVertical: 10,
    },
    grouped: {
      marginHorizontal: spacing.lg,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      overflow: "hidden" as const,
    },
    list: {
      paddingBottom: spacing.xl,
      flexGrow: 1,
    },
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
      marginLeft: 68,
    },
    separatorFlush: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 16,
    },
  }))
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filter, setFilter] = useState<string | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkApplying, setBulkApplying] = useState(false)
  const canBulkEdit = Boolean(statusOptions?.length && onBulkStatusChange)

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  async function applyBulkStatus(status: string) {
    if (!onBulkStatusChange || selectedIds.size === 0 || bulkApplying) return
    setBulkApplying(true)
    try {
      await onBulkStatusChange(Array.from(selectedIds), status)
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      exitSelectionMode()
      void queryClient.invalidateQueries({ queryKey: entityKeys.all(entity) })
    } finally {
      setBulkApplying(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data,
    error: queryError,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: entityKeys.list(entity, filter, debouncedSearch),
    queryFn: ({ pageParam }) =>
      loadPage(pageParam, {
        status: filter ?? undefined,
        search: debouncedSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  )
  const loading = isPending
  const refreshing = isRefetching && !isFetchingNextPage
  const error =
    queryError && !errorDismissed ? formatOpsError(queryError, API_URL) : null

  const onRefresh = () => {
    setErrorDismissed(false)
    // Collapse back to page 1 (matches the pre-React-Query "pull to refresh
    // resets pagination" behavior) rather than refetching every loaded page.
    queryClient.resetQueries({
      queryKey: entityKeys.list(entity, filter, debouncedSearch),
      exact: true,
    })
  }

  const onEndReached = () => {
    if (isFetchingNextPage || isRefetching || !hasNextPage) return
    void fetchNextPage()
  }

  const listHeader = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <PageHero
            eyebrow={eyebrow}
            title={title}
            compact
            description={
              description ?? "Search, filter, and tap a row to view details."
            }
          />
        </View>
        <View style={styles.headerActions}>
          {canBulkEdit ? (
            <Pressable
              style={styles.selectToggle}
              onPress={() =>
                selectionMode ? exitSelectionMode() : setSelectionMode(true)
              }
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.selectToggleText}>
                {selectionMode ? "Cancel" : "Select"}
              </Text>
            </Pressable>
          ) : null}
          {addHref && !selectionMode ? (
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.push(addHref as never)}
              accessibilityLabel="Add record"
            >
              <Plus
                color={colors.primaryForeground}
                size={22}
                strokeWidth={2.5}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
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
          onSelect={(next) => {
            setFilter(next)
            setErrorDismissed(false)
          }}
          embedded
        />
      ) : null}
      {error ? (
        <ApiErrorBanner
          message={error}
          onRetry={() => {
            setErrorDismissed(false)
            void refetch()
          }}
          onDismiss={() => setErrorDismissed(true)}
        />
      ) : null}
    </View>
  )

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        {listHeader}
        <View style={styles.grouped}>
          {renderRow ? (
            <SkeletonTriageRows count={6} />
          ) : (
            <SkeletonListRows count={6} />
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {selectionMode && canBulkEdit ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkBarLabel}>
            {selectedIds.size > 0
              ? `${selectedIds.size} selected — set status`
              : "Select records, then choose a status"}
          </Text>
          <FilterChips
            options={statusOptions!.map((option) => ({
              key: option.value,
              label: option.label,
            }))}
            selected={null}
            showAll={false}
            embedded
            onSelect={(key) => {
              if (key && !bulkApplying) void applyBulkStatus(key)
            }}
          />
        </View>
      ) : null}
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
              title="Couldn't load records"
              description="Check your connection and try again."
            />
          ) : debouncedSearch || filter ? (
            <EmptyState
              icon={Inbox}
              title="No matches"
              description="Try a different search or clear filters."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="No records yet"
              description="New submissions will appear here."
            />
          )
        }
        renderItem={({ item, index }) => {
          const openDetail = () => router.push(detailHref(item.id) as never)
          const selected = selectedIds.has(item.id)
          const rowPress =
            selectionMode && canBulkEdit
              ? () => toggleSelected(item.id)
              : openDetail
          const status = getStatus?.(item)
          const rowContent = renderRow ? (
            renderRow(item, { onPress: rowPress, index })
          ) : (
            <ListRow
              title={getTitle?.(item) ?? String(item.id)}
              subtitle={getSubtitle?.(item)}
              meta={
                item.created_at
                  ? formatRelativeTime(item.created_at)
                  : undefined
              }
              initials={
                getInitials?.(item) ?? getTitle?.(item) ?? String(item.id)
              }
              statusLabel={status ? formatLabel(status) : undefined}
              statusVariant={getStatusVariant?.(item) ?? "muted"}
              onPress={rowPress}
              showChevron={!selectionMode}
            />
          )
          return (
            <View
              style={[
                styles.rowWrapper,
                index === 0 && styles.rowFirst,
                index === items.length - 1 && styles.rowLast,
              ]}
            >
              <View style={styles.rowInner}>
                {selectionMode && canBulkEdit ? (
                  <Pressable
                    onPress={() => toggleSelected(item.id)}
                    hitSlop={8}
                    style={styles.checkbox}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={
                      selected ? "Deselect record" : "Select record"
                    }
                  >
                    {selected ? (
                      <CheckboxOn color={colors.primary} size={22} />
                    ) : (
                      <CheckboxOff color={colors.mutedForeground} size={22} />
                    )}
                  </Pressable>
                ) : null}
                <View style={styles.rowContentFlex}>{rowContent}</View>
              </View>
              {index < items.length - 1 ? (
                <View
                  style={renderRow ? styles.separatorFlush : styles.separator}
                />
              ) : null}
            </View>
          )
        }}
      />
    </View>
  )
}
