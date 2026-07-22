import { useAuth, useUser } from "@clerk/clerk-expo"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { useMemo } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { DateRangeKey } from "@workspace/ops-contracts"
import { FileText, LogOut, Mail, Person } from "@/components/icons"

import { SettingsRow } from "@/components/settings/settings-row"
import { ThemeSettingsSection } from "@/components/theme-settings-section"
import { getPrimaryEmail } from "@/lib/auth"
import { API_URL } from "@/lib/ops-client"
import { useOpsClient } from "@/lib/ops-client"
import { spacing, typography, useThemeColors } from "@/lib/theme"

export default function MoreScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()
  const { user } = useUser()
  const client = useOpsClient()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId,
  )
  const rawName =
    user?.firstName?.trim() || email?.split("@")[0] || "Staff"
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const [counts, setCounts] = useState<{ waitlist: number; mediaKit: number }>({
    waitlist: 0,
    mediaKit: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchCounts() {
      try {
        const stats = await client.stats.get({ range: "all" as DateRangeKey })
        if (!cancelled) {
          setCounts({
            waitlist: stats.overview.totals.waitlist,
            mediaKit: stats.overview.totals.mediaKit,
          })
        }
      } catch {
        // Counts are optional on this screen
      }
    }

    void fetchCounts()
    return () => {
      cancelled = true
    }
  }, [client])

  const version = Constants.expoConfig?.version ?? "0.0.1"

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        content: {
          paddingHorizontal: spacing.lg,
          gap: spacing.lg,
        },
        hero: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: 16,
          backgroundColor: colors.primary,
        },
        avatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primaryForeground,
          alignItems: "center",
          justifyContent: "center",
        },
        heroCopy: { flex: 1, gap: 4 },
        heroTitle: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.primaryForeground,
        },
        heroSubtitle: {
          ...typography.caption,
          color: "rgba(250, 249, 247, 0.85)",
          lineHeight: 18,
        },
        section: { gap: spacing.sm },
        sectionLabel: {
          ...typography.caption,
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: "700",
          marginLeft: spacing.xs,
        },
        group: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: "hidden",
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: 60,
        },
        footer: {
          padding: spacing.md,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.muted,
          gap: 4,
        },
        footerLabel: {
          ...typography.caption,
          color: colors.mutedForeground,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        footerValue: {
          ...typography.body,
          color: colors.text,
        },
        footerHint: {
          ...typography.caption,
          color: colors.mutedForeground,
          marginTop: spacing.xs,
        },
      }),
    [colors],
  )

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Person color={colors.primary} size={36} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{displayName}</Text>
          <Text style={styles.heroSubtitle}>
            {email ?? "Admobi Ops staff"} · internal console
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Modules</Text>
        <View style={styles.group}>
          <SettingsRow
            icon={Mail}
            label="Waitlist"
            description={`${counts.waitlist} entries`}
            onPress={() => router.push("/(ops)/waitlist")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={FileText}
            label="Media kit"
            description={`${counts.mediaKit} requests`}
            onPress={() => router.push("/(ops)/media-kit")}
          />
        </View>
      </View>

      <ThemeSettingsSection />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          <SettingsRow
            icon={LogOut}
            label="Sign out"
            description="End your ops session"
            onPress={() => void signOut()}
            destructive
            showChevron={false}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Environment</Text>
        <Text style={styles.footerValue}>API: {API_URL}</Text>
        <Text style={styles.footerHint}>Ops mobile · v{version}</Text>
      </View>
    </ScrollView>
  )
}
