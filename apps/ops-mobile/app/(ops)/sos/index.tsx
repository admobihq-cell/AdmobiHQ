import { useEffect, useMemo, useState } from "react"
import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useInfiniteQuery } from "@tanstack/react-query"

import {
  ACK_TARGET_SECONDS,
  SAFETY_INCIDENT_STATUSES,
  SAFETY_TERMINAL_STATUSES,
  formatLabel,
  formatRelativeTime,
  type SafetyIncidentDto,
} from "@workspace/ops-contracts"

import { Search, ShieldCheck, Siren } from "@/components/icons"
import { FilterChips } from "@/components/app/filter-chips"
import { ListRow } from "@/components/app/list-row"
import { PageHero } from "@/components/ui/page-hero"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { formatOpsError } from "@/lib/format-error"
import { usePageHeader } from "@/lib/page-header"
import { spacing, typography, useResolvedTheme, useThemeColors, useThemedStyles } from "@/lib/theme"

const STATUS_VARIANT: Record<string, "muted" | "attention" | "progress" | "success"> = {
  new: "attention",
  acknowledged: "progress",
  in_progress: "progress",
  resolved: "success",
  cancelled: "muted",
}

const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)
const SEARCH_DEBOUNCE_MS = 300

function isAwaitingAck(incident: SafetyIncidentDto): boolean {
  return !incident.acknowledged_at && !TERMINAL.has(incident.status)
}

/** "Unacked 7m" is the number that matters on this screen; everything else is
 *  context. Kept as a string rather than a live ticker — a phone list
 *  re-rendering every second for every row is not worth the second-precision. */
function waitLine(incident: SafetyIncidentDto): string {
  if (incident.acknowledged_at) return `Acked ${formatRelativeTime(incident.acknowledged_at)}`
  if (TERMINAL.has(incident.status)) return formatLabel(incident.status)

  const seconds = Math.floor((Date.now() - new Date(incident.created_at).getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)
  const late = seconds > ACK_TARGET_SECONDS
  return `${late ? "⚠ " : ""}Unacked ${minutes}m`
}

export default function SosListScreen() {
  usePageHeader("SOS")
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const resolvedTheme = useResolvedTheme()
  const client = useOpsClient()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
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
    queryKey: ["safety", "list", status, debouncedSearch],
    queryFn: ({ pageParam }) =>
      client.safety.list({
        page: pageParam,
        pageSize: 50,
        search: debouncedSearch || undefined,
        status: status ?? undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    // Matches the ops web queue: poll hard while anything is live, back off
    // when it is quiet.
    refetchInterval: (query) => {
      const items = query.state.data?.pages.flatMap((page) => page.items) ?? []
      return items.some((i) => i.status === "new" || i.status === "acknowledged")
        ? 15_000
        : 60_000
    },
  })

  // Unacknowledged incidents float to the top — the same rule as ops web, for
  // the same reason: nothing new may go unseen.
  const items = useMemo(() => {
    const raw = data?.pages.flatMap((page) => page.items) ?? []
    return [...raw].sort((a, b) => {
      const aWaiting = isAwaitingAck(a)
      const bWaiting = isAwaitingAck(b)
      if (aWaiting !== bWaiting) return aWaiting ? -1 : 1
      return 0
    })
  }, [data])

  const loading = isPending
  const refreshing = isRefetching && !isFetchingNextPage
  const error = queryError && !errorDismissed ? formatOpsError(queryError, API_URL) : null

  const onRefresh = () => {
    setErrorDismissed(false)
    void refetch()
  }

  const onEndReached = () => {
    if (isFetchingNextPage || isRefetching || !hasNextPage) return
    void fetchNextPage()
  }

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    searchWrap: { position: "relative" as const, marginBottom: spacing.sm },
    searchIcon: { position: "absolute" as const, left: spacing.md, top: 12, zIndex: 1 },
    searchInput: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingLeft: 40,
      paddingRight: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.surface,
    },
    banner: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.destructive,
      backgroundColor: c.destructiveMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    bannerText: { ...typography.label, color: c.destructive },
    listContent: { paddingBottom: insets.bottom + spacing.xl },
    separator: { height: 1, backgroundColor: c.border, marginLeft: spacing.lg },
    emptyWrap: { padding: spacing.xl, alignItems: "center" as const, gap: spacing.xs },
    emptyText: { ...typography.body, color: c.mutedForeground, textAlign: "center" as const },
    errorWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    footerWrap: { paddingVertical: spacing.md },
  }))

  const unackedCount = items.filter(isAwaitingAck).length

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <PageHero
          icon={Siren}
          title="SOS"
          description="Safety incidents reported by drivers. Acknowledge fast, then call them."
        />
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon} pointerEvents="none">
            <Search size={16} color={colors.mutedForeground} />
          </View>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search driver, phone, description…"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      {unackedCount > 0 ? (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerText}>
            {unackedCount} unacknowledged {unackedCount === 1 ? "report" : "reports"} — respond
            now.
          </Text>
        </View>
      ) : null}

      <FilterChips
        options={SAFETY_INCIDENT_STATUSES.map((key) => ({ key, label: formatLabel(key) }))}
        selected={status}
        onSelect={setStatus}
      />

      {error ? (
        <View style={styles.errorWrap}>
          <ApiErrorBanner
            message={error}
            onRetry={onRefresh}
            onDismiss={() => setErrorDismissed(true)}
          />
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          extraData={resolvedTheme}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerWrap}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <ShieldCheck size={20} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No incidents. Good.</Text>
            </View>
          }
          renderItem={({ item }: { item: SafetyIncidentDto }) => (
            <ListRow
              title={`${formatLabel(item.type)} · ${item.driver_name ?? "Unnamed driver"}`}
              subtitle={waitLine(item)}
              meta={`#${item.id} · ${formatLabel(item.severity)} · ${formatRelativeTime(item.created_at)}`}
              initials={item.driver_name ?? "SOS"}
              statusLabel={formatLabel(item.status)}
              statusVariant={STATUS_VARIANT[item.status] ?? "muted"}
              destructive={isAwaitingAck(item)}
              onPress={() => router.push(`/(ops)/sos/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}
