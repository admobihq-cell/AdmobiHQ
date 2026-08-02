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
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated"
import { useRouter } from "expo-router"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import * as Haptics from "expo-haptics"
import {
  CheckboxOff,
  CheckboxOn,
  Inbox,
  Plus,
  Search,
  Trash,
  type AppIcon,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui"
import type { EntityKey } from "@/lib/entity-form-config"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { entityKeys } from "@/lib/query-keys"
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

// Hoisted so they're stable references across renders — a fresh FadeOutDown
// instance on every render can make Reanimated restart the exit animation
// mid-flight if the parent re-renders (e.g. a bulk apply) while it's closing.
const BULK_BAR_ENTERING = FadeInDown.duration(200)
const BULK_BAR_EXITING = FadeOutDown.duration(150)
// Matches the bottom tab bar's own height calc in (ops)/_layout.tsx.
const TAB_BAR_HEIGHT = 60

type EntityListLoadOptions = {
  status?: string | null
  search?: string | null
}

type EntityListProps<T extends { id: number }> = {
  entity: EntityKey
  title: string
  description?: string
  /** Tinted icon tile shown beside the title, replacing the old repeated "Operations" eyebrow as the section's visual identity. */
  icon?: AppIcon
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
    ctx: { onPress: () => void; onLongPress: () => void; index: number }
  ) => ReactNode
  filterOptions?: FilterChipOption[]
  detailHref: (id: number) => string
  addHref?: string
  /** Enables long-list triage: long-press a row to select it and start a bulk status change. Requires both props together. */
  statusOptions?: FormFieldOption[]
  onBulkStatusChange?: (ids: number[], status: string) => Promise<unknown>
  /** Enables bulk delete from the same long-press selection UI. Independent of statusOptions/onBulkStatusChange — either or both may be provided. */
  onBulkDelete?: (ids: number[]) => Promise<unknown>
}

const SEARCH_DEBOUNCE_MS = 300

export function EntityList<T extends { id: number; created_at?: string }>({
  entity,
  title,
  description,
  icon,
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
  onBulkDelete,
}: EntityListProps<T>) {
  usePageHeader(title)
  const router = useRouter()
  const queryClient = useQueryClient()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
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
    bulkBar: {
      position: "absolute" as const,
      left: spacing.lg,
      right: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      // Reanimated-driven opacity (FadeInDown/FadeOutDown below) doesn't fade
      // Android's elevation shadow with it, leaving a ghost trail — same fix
      // as the FAB menu's item rows use.
      elevation: Platform.OS === "android" ? 0 : 8,
    },
    bulkBarTop: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    bulkBarCount: {
      ...typography.section,
      color: c.text,
    },
    bulkBarActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    bulkBarCancel: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.mutedForeground,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    bulkDeleteButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.destructive,
      backgroundColor: `${c.destructive}12`,
    },
    bulkDeleteButtonDisabled: {
      opacity: 0.5,
    },
    bulkDeleteLabel: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.destructive,
    },
    bulkStatusSection: {
      gap: spacing.xs,
    },
    bulkStatusLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkApplying, setBulkApplying] = useState(false)
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false)
  const canBulkEditStatus = Boolean(statusOptions?.length && onBulkStatusChange)
  const canBulkAct = canBulkEditStatus || Boolean(onBulkDelete)
  // Selection mode is implicit: long-pressing a row selects it, which is
  // enough to enter "bulk" state on its own — no separate mode toggle to
  // show or hide.
  const selectionMode = canBulkAct && selectedIds.size > 0

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
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
      clearSelection()
      void queryClient.invalidateQueries({ queryKey: entityKeys.all(entity) })
    } finally {
      setBulkApplying(false)
    }
  }

  async function applyBulkDelete() {
    if (!onBulkDelete || selectedIds.size === 0 || bulkApplying) return
    setBulkApplying(true)
    try {
      await onBulkDelete(Array.from(selectedIds))
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      setConfirmDeleteVisible(false)
      clearSelection()
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
    <View style={[styles.header, { paddingTop: spacing.md }]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <PageHero
            icon={icon}
            title={title}
            compact
            description={
              description ?? "Search, filter, and tap a row to view details."
            }
          />
        </View>
        <View style={styles.headerActions}>
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
        contentContainerStyle={[
          styles.list,
          selectionMode && { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 140 },
        ]}
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
          const rowPress = selectionMode
            ? () => toggleSelected(item.id)
            : openDetail
          const rowLongPress = canBulkAct
            ? () => toggleSelected(item.id)
            : () => {}
          const status = getStatus?.(item)
          const rowContent = renderRow ? (
            renderRow(item, {
              onPress: rowPress,
              onLongPress: rowLongPress,
              index,
            })
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
              onLongPress={rowLongPress}
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
                {selectionMode ? (
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
      {selectionMode ? (
        <Animated.View
          entering={BULK_BAR_ENTERING}
          exiting={BULK_BAR_EXITING}
          style={[
            styles.bulkBar,
            { bottom: TAB_BAR_HEIGHT + insets.bottom + spacing.sm },
          ]}
        >
          <View style={styles.bulkBarTop}>
            <Text style={styles.bulkBarCount}>{selectedIds.size} selected</Text>
            <View style={styles.bulkBarActions}>
              {onBulkDelete ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.bulkDeleteButton,
                    (pressed || bulkApplying) && styles.bulkDeleteButtonDisabled,
                  ]}
                  onPress={() => setConfirmDeleteVisible(true)}
                  disabled={bulkApplying}
                  accessibilityRole="button"
                  accessibilityLabel="Delete selected"
                >
                  <Trash size={14} color={colors.destructive} />
                  <Text style={styles.bulkDeleteLabel}>Delete</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={clearSelection} hitSlop={8}>
                <Text style={styles.bulkBarCancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
          {canBulkEditStatus ? (
            <View style={styles.bulkStatusSection}>
              <Text style={styles.bulkStatusLabel}>Set status</Text>
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
        </Animated.View>
      ) : null}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title={`Delete ${selectedIds.size} record${selectedIds.size === 1 ? "" : "s"}?`}
        message="This can't be undone."
        confirmLabel={bulkApplying ? "Deleting…" : "Delete"}
        destructive
        onConfirm={() => void applyBulkDelete()}
        onCancel={() => {
          if (!bulkApplying) setConfirmDeleteVisible(false)
        }}
      />
    </View>
  )
}
