import { useCallback } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { Stack, useFocusEffect, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { SkeletonCaseRows } from "@/components/app/skeleton"
import { Add, ChevronRight, HelpCircle } from "@/components/icons"
import { CategoryIcon, SupportStatusPill } from "@/components/support/support-ui"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { useCustomerSession } from "@/lib/auth/use-customer-session"
import { listMySupportCases } from "@/lib/support"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

// useAuth() requires a ClerkProvider ancestor, only mounted when
// isAuthEnabled() is true (see app/_layout.tsx's AuthenticatedApp); this
// screen renders under that same conditional tree. isAuthEnabled() is fixed
// for the app's lifetime, so pick the hook implementation once at module
// load — same pattern as lib/auth/use-customer-session.ts,
// lib/use-push-registration.ts, and settings/support/new.tsx.
function useSupportTokenGetterEnabled(): () => Promise<string | null> {
  const { getToken } = useAuth()
  return getToken
}

function useSupportTokenGetterDisabled(): () => Promise<string | null> {
  return async () => null
}

const useSupportTokenGetter = isAuthEnabled()
  ? useSupportTokenGetterEnabled
  : useSupportTokenGetterDisabled

export default function SupportSettingsScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const session = useCustomerSession()
  const getToken = useSupportTokenGetter()

  const casesQuery = useQuery({
    queryKey: ["customer-support-cases", session.status],
    queryFn: async () => {
      const token = session.status === "authenticated" ? await getToken() : null
      return listMySupportCases(token)
    },
    enabled: session.status !== "loading",
  })
  const cases = casesQuery.data ?? []
  const loading = casesQuery.isLoading

  const refetchCases = casesQuery.refetch
  useFocusEffect(
    useCallback(() => {
      void refetchCases()
    }, [refetchCases]),
  )

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
    hero: { gap: spacing.xs },
    title: { ...typography.title, color: c.text, fontSize: 26 },
    subtitle: { ...typography.body, color: c.mutedForeground, marginTop: spacing.xs },
    list: { gap: spacing.md },
    caseRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    caseRowPressed: { opacity: 0.85 },
    caseIconTile: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.accentSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    caseCopy: { flex: 1, gap: 2 },
    caseSubject: { ...typography.section, color: c.text },
    caseMeta: { ...typography.caption, color: c.mutedForeground },
    emptyState: {
      alignItems: "center" as const,
      gap: spacing.xs,
      padding: spacing.xl,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
    emptyTitle: { ...typography.section, color: c.text },
    emptyText: {
      ...typography.bodySm,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
    emptyButton: {
      marginTop: spacing.sm,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: c.primary,
    },
    emptyButtonPressed: { opacity: 0.9 },
    emptyButtonText: {
      ...typography.label,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
    fab: {
      position: "absolute" as const,
      right: spacing.lg,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 999,
      backgroundColor: c.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    fabPressed: { opacity: 0.9 },
    fabLabel: { ...typography.section, color: c.primaryForeground },
  }))

  return (
    <>
      <Stack.Screen options={{ title: "Help & contact" }} />
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.xl + 64,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={casesQuery.isRefetching}
              onRefresh={() => void refetchCases()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.title}>Help &amp; contact</Text>
            <Text style={styles.subtitle}>
              Billing, campaigns, or anything else — send a request and we&apos;ll reply
              here, usually within one business day.
            </Text>
          </View>

          {loading ? (
            <SkeletonCaseRows count={5} />
          ) : cases.length === 0 ? (
            <View style={styles.emptyState}>
              <HelpCircle size={20} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyText}>
                Send a request and the team&apos;s replies will show up here on this
                device.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.emptyButtonPressed,
                ]}
                onPress={() => router.push("/settings/support/new")}
                accessibilityRole="button"
              >
                <Add size={16} color={colors.primaryForeground} />
                <Text style={styles.emptyButtonText}>New request</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {cases.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.caseRow, pressed && styles.caseRowPressed]}
                  onPress={() => router.push(`/settings/support/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.subject}, ${item.status}`}
                >
                  <View style={styles.caseIconTile}>
                    <CategoryIcon category={item.category} size={17} color={colors.primary} />
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
              ))}
            </View>
          )}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + spacing.lg },
            pressed && styles.fabPressed,
          ]}
          onPress={() => router.push("/settings/support/new")}
          accessibilityRole="button"
          accessibilityLabel="New request"
        >
          <Add color={colors.primaryForeground} size={24} />
          <Text style={styles.fabLabel}>New request</Text>
        </Pressable>
      </View>
    </>
  )
}
