import { useCallback, useEffect, useState } from "react"
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

import { formatLabel, formatRelativeTime, SUPPORT_STATUSES, type SupportCaseDto } from "@workspace/ops-contracts"

import { Inbox, LifeBuoy, Search } from "@/components/icons"
import { FilterChips } from "@/components/app/filter-chips"
import { ListRow } from "@/components/app/list-row"
import { PageHero } from "@/components/ui/page-hero"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { formatOpsError } from "@/lib/format-error"
import { usePageHeader } from "@/lib/page-header"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const STATUS_VARIANT: Record<string, "muted" | "attention" | "progress" | "success"> = {
  open: "attention",
  pending: "progress",
  resolved: "success",
  closed: "muted",
}

export default function SupportListScreen() {
  usePageHeader("Support")
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const client = useOpsClient()

  const [items, setItems] = useState<SupportCaseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const result = await client.support.list({
          page: 1,
          pageSize: 50,
          search: search || undefined,
          status: status ?? undefined,
        })
        setItems(result.items)
      } catch (e) {
        setError(formatOpsError(e, API_URL))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [client, search, status],
  )

  useEffect(() => {
    const timeout = setTimeout(() => void load("initial"), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [search, status])

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
    listContent: { paddingBottom: insets.bottom + spacing.xl },
    separator: { height: 1, backgroundColor: c.border, marginLeft: spacing.lg },
    emptyWrap: { padding: spacing.xl, alignItems: "center" as const, gap: spacing.xs },
    emptyText: { ...typography.body, color: c.mutedForeground, textAlign: "center" as const },
    errorWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  }))

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <PageHero
          icon={LifeBuoy}
          title="Support"
          description="Cases from the landing page, customer web, and customer mobile."
        />
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon} pointerEvents="none">
            <Search size={16} color={colors.mutedForeground} />
          </View>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search subject, name, email…"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      <FilterChips
        options={SUPPORT_STATUSES.map((key) => ({ key, label: formatLabel(key) }))}
        selected={status}
        onSelect={setStatus}
      />

      {error ? (
        <View style={styles.errorWrap}>
          <ApiErrorBanner message={error} onRetry={() => void load("initial")} />
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
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Inbox size={20} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No support cases yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.subject}
              subtitle={`${item.contact_name} · ${item.contact_email}`}
              meta={`#${item.id} · ${formatLabel(item.category)} · ${formatRelativeTime(item.created_at)}`}
              initials={item.contact_name}
              statusLabel={formatLabel(item.status)}
              statusVariant={STATUS_VARIANT[item.status] ?? "muted"}
              onPress={() => router.push(`/(ops)/support/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}
