import { useMemo } from "react"
import { useRouter } from "expo-router"
import { ScrollView, StyleSheet, Text, View } from "react-native"

import {
  Bell,
  Card,
  Globe,
  HelpCircle,
  Person,
  Shield,
} from "@/components/icons"
import { SettingsRow } from "@/components/settings/settings-row"
import { ThemeSettingsSection } from "@/components/theme-settings-section"
import { EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APP_URL } from "@/lib/env"
import { spacing, typography, useThemeColors } from "@/lib/theme"

export default function SettingsScreen() {
  const colors = useThemeColors()
  const router = useRouter()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        content: {
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: spacing.xl,
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
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Person color={colors.primary} size={36} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Admobi Customer</Text>
          <Text style={styles.heroSubtitle}>
            Settings refreshed via OTA — tap any row to explore.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          <SettingsRow
            icon={Person}
            label="Profile & sign-in"
            description="Name, email, and access"
            onPress={() => router.push("/settings/account")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={Shield}
            label="Security"
            description="Password and device sessions"
            onPress={() => router.push("/settings/security")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.group}>
          <SettingsRow
            icon={Bell}
            label="Notifications"
            description="Campaign alerts and digests"
            onPress={() => router.push("/settings/notifications")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={Card}
            label="Billing"
            description="Invoices and payment methods"
            onPress={() => router.push("/settings/billing")}
          />
        </View>
      </View>

      <ThemeSettingsSection />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.group}>
          <SettingsRow
            icon={HelpCircle}
            label="Help & contact"
            description="FAQs and support requests"
            onPress={() => router.push("/settings/support")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={Globe}
            label="Open web app"
            description={EXPO_PUBLIC_APP_URL ?? "http://localhost:3002"}
            onPress={() => router.push("/settings/web-app")}
          />
        </View>
      </View>

      {__DEV__ ? (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Environment</Text>
          <Text style={styles.footerValue}>
            API: {EXPO_PUBLIC_API_URL ?? "not set"}
          </Text>
          <Text style={styles.footerHint}>Customer app · OTA test build</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}
