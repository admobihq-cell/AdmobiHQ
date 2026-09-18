import { useCallback } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { useFocusEffect, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { SkeletonCaseRows } from "@/components/app/skeleton"
import { ChevronRight, HelpCircle, Plus } from "@/components/icons"
import { CategoryIcon, SupportStatusPill } from "@/components/support/support-ui"
import { useDriverSession } from "@/lib/auth/use-driver-session"
import { getStoredIdentity, listMySupportCases } from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function SupportScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const session = useDriverSession()
  const { getToken } = useAuth()

  const casesQuery = useQuery({
    queryKey: ["driver-support-cases", session.status],
    queryFn: async () => {
      if (session.status === "authenticated") {
        const token = await getToken()
        return listMySupportCases(token)
      }

      const identity = await getStoredIdentity()
      if (!identity) return []
      return listMySupportCases()
    },
    enabled: session.status !== "loading",
  })
  const cases = casesQuery.data ?? []
  const loadingCases = casesQuery.isLoading
  const refreshing = casesQuery.isRefetching

  const refetchCases = casesQuery.refetch
  useFocusEffect(
    useCallback(() => {
      void refetchCases()
    }, [refetchCases]),
  )

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.xl },
    intro: { gap: spacing.xs },
    introTitle: { ...typography.title, color: c.text },
    introBody: { ...typography.bodySm, color: c.mutedForeground },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    newButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.xs,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
    },
    newButtonText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
    caseRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    caseIconTile: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    caseCopy: { flex: 1, gap: 2 },
    caseSubject: { ...typography.section, color: c.text },
    caseMeta: { ...typography.caption, color: c.mutedForeground },
    emptyCard: {
      alignItems: "flex-start" as const,
      gap: spacing.xs,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
    emptyText: { ...typography.bodySm, color: c.mutedForeground },
  }))

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void casesQuery.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Help &amp; contact</Text>
        <Text style={styles.introBody}>
          Earnings, routes, deliveries, or anything else — send a request and we&apos;ll reply
          here, usually within one business day.
        </Text>
      </View>

      <Pressable
        style={styles.newButton}
        onPress={() => router.push("/support/new")}
        accessibilityRole="button"
      >
        <Plus size={18} color={colors.primaryForeground} />
        <Text style={styles.newButtonText}>New request</Text>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionLabel}>My requests</Text>
        {loadingCases ? (
          <SkeletonCaseRows count={5} />
        ) : cases.length === 0 ? (
          <View style={styles.emptyCard}>
            <HelpCircle size={18} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              Requests you send will show up here on this device.
            </Text>
          </View>
        ) : (
          cases.map((item) => (
            <Pressable
              key={item.id}
              style={styles.caseRow}
              onPress={() => router.push(`/support/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.caseIconTile}>
                <CategoryIcon category={item.category} size={16} color={colors.mutedForeground} />
              </View>
              <View style={styles.caseCopy}>
                <Text style={styles.caseSubject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={styles.caseMeta}>#{item.id}</Text>
              </View>
              <SupportStatusPill status={item.status} />
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  )
}
