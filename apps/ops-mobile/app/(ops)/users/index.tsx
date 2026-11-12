import { useEffect, useState } from "react"
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { SegmentTabs } from "@workspace/mobile-charts"
import { formatDateTime, type PlatformUserDto, type PlatformUserType, type TeamMemberDto } from "@workspace/ops-contracts"

import { ListRow } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import type { StatusChipVariant } from "@/components/app/status-chip"
import { Search, Users } from "@/components/icons"
import { EmptyState } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAccess, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type Segment = PlatformUserType | "admins"

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

const STATUS: Record<PlatformUserDto["status"], { label: string; variant: StatusChipVariant }> = {
  active: { label: "Active", variant: "success" },
  banned: { label: "Banned", variant: "attention" },
  locked: { label: "Locked", variant: "muted" },
}

const initialsOf = (text: string) =>
  text
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")

/**
 * Everyone with an account, as on the ops console's Users page: drivers and customers from the
 * identity provider (searched and paged by the API), and ops admins from the team list. Ops admin only,
 * like the web: anyone else sees no-access and nothing is requested.
 */
export default function UsersScreen() {
  usePageHeader("Users", { showBack: true, backHref: "/(ops)/dashboard" })
  const palette = useChartPalette()
  const colors = useThemeColors()
  const client = useOpsClient()
  const authReady = useOpsAuthReady()
  const { role, loading } = useOpsAccess()
  const isAdmin = role === "admin"
  const [segment, setSegment] = useState<Segment>("customers")
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const platform = useInfiniteQuery({
    queryKey: ["ops-users", segment, query] as const,
    queryFn: ({ pageParam }) =>
      client.users.list({ type: segment as PlatformUserType, query: query || undefined, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * PAGE_SIZE : undefined),
    enabled: authReady && isAdmin && segment !== "admins",
  })
  const team = useQuery({ queryKey: ["team"], queryFn: () => client.team.list(), enabled: authReady && isAdmin && segment === "admins" })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: spacing.lg, gap: 12 },
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
    searchInput: { flex: 1, ...typography.body, color: c.text, paddingVertical: 10 },
    list: { marginHorizontal: spacing.lg, backgroundColor: c.surface },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 16 },
    centered: { flex: 1, backgroundColor: c.bg, alignItems: "center" as const, justifyContent: "center" as const },
  }))

  if (loading) return <View style={styles.centered} />
  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={Users} title="You don't have access to Users" description="Only ops admins can see every account on the platform." />
      </View>
    )
  }

  const needle = query.toLowerCase()
  const admins = (team.data?.members ?? []).filter(
    (m) => !needle || m.email.toLowerCase().includes(needle) || (m.roleName ?? "").toLowerCase().includes(needle),
  )
  const active = segment === "admins" ? team : platform
  const people: (PlatformUserDto | TeamMemberDto)[] = segment === "admins" ? admins : (platform.data?.pages.flatMap((p) => p.users) ?? [])
  const total = segment === "admins" ? admins.length : platform.data?.pages[0]?.total

  const header = (
    <View style={styles.header}>
      <SegmentTabs<Segment>
        palette={palette}
        value={segment}
        onChange={setSegment}
        tabs={[
          { value: "customers", label: "Customers" },
          { value: "drivers", label: "Drivers" },
          { value: "admins", label: "Admins" },
        ]}
      />
      <View style={styles.searchBox}>
        <Search color={colors.mutedForeground} size={18} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={segment === "admins" ? "Search email or role" : "Search name, email or phone"}
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search users"
        />
      </View>
      {active.isError ? <ApiErrorBanner message={formatOpsError(active.error, API_URL)} onRetry={() => void active.refetch()} /> : null}
    </View>
  )

  return (
    <FlatList
      style={styles.container}
      data={people}
      keyExtractor={(item) => ("userId" in item ? item.userId : item.id)}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <View style={styles.list}>{renderPerson(item)}</View>}
      ListEmptyComponent={
        active.isPending ? (
          <SkeletonListRows />
        ) : active.isError ? null : (
          <EmptyState icon={Users} title={query ? "No one matches" : "No accounts yet"} description={query ? `Nothing found for "${query}".` : undefined} />
        )
      }
      ListFooterComponent={
        total !== undefined && people.length > 0 ? (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ color: palette.muted, fontSize: 12, textAlign: "center" }}>{`Showing ${people.length} of ${total}`}</Text>
          </View>
        ) : null
      }
      onEndReached={() => {
        if (segment !== "admins" && platform.hasNextPage && !platform.isFetchingNextPage) void platform.fetchNextPage()
      }}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={() => void active.refetch()} />}
    />
  )
}

/** One account: every field the web Users table shows (there is no per-user detail page or endpoint). */
function renderPerson(item: PlatformUserDto | TeamMemberDto) {
  return "userId" in item ? (
    <ListRow
      title={item.email}
      subtitle={item.roleName ?? (item.role === "admin" ? "Admin" : "Member")}
      meta={`Joined ${formatDateTime(item.joinedAt)}`}
      initials={initialsOf(item.email)}
      statusLabel={item.role === "admin" ? "Admin" : "Member"}
      statusVariant={item.role === "admin" ? "primary" : "muted"}
    />
  ) : (
    <ListRow
      title={item.name}
      subtitle={[item.company, item.email, item.phone].filter(Boolean).join(" · ") || "No contact details"}
      meta={`Joined ${formatDateTime(item.createdAt)}`}
      initials={initialsOf(item.name || item.email || "?")}
      statusLabel={STATUS[item.status].label}
      statusVariant={STATUS[item.status].variant}
    />
  )
}
