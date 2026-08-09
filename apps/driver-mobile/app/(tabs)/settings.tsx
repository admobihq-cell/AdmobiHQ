import Constants from "expo-constants"
import * as Updates from "expo-updates"
import { useMemo, useState } from "react"
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { RefreshCcw } from "@/components/icons"
import { SettingsRow } from "@/components/settings/settings-row"
import { ThemeSettingsSection } from "@/components/theme-settings-section"
import { checkForUpdateManually } from "@/lib/bootstrap-splash"
import { EXPO_PUBLIC_API_URL } from "@/lib/env"
import { spacing, typography, useThemeColors } from "@/lib/theme"

export default function SettingsScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const version = Constants.expoConfig?.version ?? "0.0.1"
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  async function handleCheckForUpdates() {
    if (checkingUpdate) return
    setCheckingUpdate(true)
    const result = await checkForUpdateManually()
    setCheckingUpdate(false)

    switch (result.status) {
      case "unsupported":
        Alert.alert("Not available", "Update checks aren't available in this build.")
        return
      case "up-to-date":
        Alert.alert("You're up to date", "You're running the latest version of the app.")
        return
      case "error":
        Alert.alert("Couldn't check for updates", "Check your connection and try again.")
        return
      case "downloaded":
        Alert.alert(
          "Update ready",
          "A new version has been downloaded. Restart now to apply it?",
          [
            { text: "Later", style: "cancel" },
            { text: "Restart now", onPress: () => void Updates.reloadAsync() },
          ],
        )
    }
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
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
        footerValue: { ...typography.caption, color: colors.mutedForeground },
      }),
    [colors],
  )

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ThemeSettingsSection />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.group}>
          <SettingsRow
            icon={RefreshCcw}
            label="Check for updates"
            description={checkingUpdate ? "Checking…" : "Get the latest version now"}
            onPress={handleCheckForUpdates}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Connected to</Text>
        <Text style={styles.footerValue}>{EXPO_PUBLIC_API_URL ?? "http://localhost:3003"}</Text>
        <Text style={styles.footerValue}>Driver app · v{version}</Text>
      </View>
    </ScrollView>
  )
}
