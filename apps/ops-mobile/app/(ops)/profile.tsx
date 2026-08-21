import { useAuth, useUser } from "@clerk/clerk-expo"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import * as Updates from "expo-updates"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { PlatformFlagDto, PlatformFlagKey } from "@workspace/ops-contracts"
import {
  Bell,
  LogOut,
  Person,
  RefreshCcw,
  Rocket,
  Sparkles,
} from "@/components/icons"

import { SettingsRow } from "@/components/settings/settings-row"
import { ThemeSettingsSection } from "@/components/theme-settings-section"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getPrimaryEmail } from "@/lib/auth"
import { checkForUpdateManually } from "@/lib/bootstrap-splash"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { spacing, typography, useThemeColors } from "@/lib/theme"

const FLAG_COPY: Record<string, { label: string; description: string }> = {
  deliveries: {
    label: "Deliveries",
    description:
      "Shows the Deliveries placeholder screens in customer-web, driver-web, and driver-mobile — the real booking/dispatch feature isn't built yet, this only controls whether the story is visible.",
  },
}

function formatUpdated(flag: PlatformFlagDto): string | null {
  if (!flag.updated_by_email) return null
  const when = new Date(flag.updated_at)
  if (Number.isNaN(when.getTime())) return null
  return `${flag.enabled ? "Enabled" : "Disabled"} by ${flag.updated_by_email} · ${when.toLocaleDateString(
    "en-KE",
    { day: "numeric", month: "short", year: "numeric" },
  )}`
}

export default function ProfileScreen() {
  usePageHeader("Profile")
  const colors = useThemeColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()
  const { user } = useUser()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId
  )
  const rawName = user?.firstName?.trim() || email?.split("@")[0] || "Staff"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const version = Constants.expoConfig?.version ?? "0.0.1"

  const opsClient = useOpsClient()
  const queryClient = useQueryClient()

  const flagsQuery = useQuery({
    queryKey: ["platform-flags"],
    queryFn: () => opsClient.flags.list(),
  })
  const flags = flagsQuery.data?.items ?? null

  const toggleFlagMutation = useMutation({
    mutationFn: (flag: PlatformFlagDto) =>
      opsClient.flags.update({
        key: flag.key as PlatformFlagKey,
        enabled: !flag.enabled,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-flags"] })
    },
    onError: () => {
      Alert.alert("Couldn't update flag", "Check your connection and try again.")
    },
  })
  function toggleFlag(flag: PlatformFlagDto) {
    toggleFlagMutation.mutate(flag)
  }
  const pendingFlagKey = toggleFlagMutation.isPending
    ? (toggleFlagMutation.variables?.key ?? null)
    : null

  const [checkingUpdate, setCheckingUpdate] = useState(false)

  async function handleCheckForUpdates() {
    if (checkingUpdate) return
    setCheckingUpdate(true)
    const result = await checkForUpdateManually()
    setCheckingUpdate(false)

    switch (result.status) {
      case "unsupported":
        Alert.alert(
          "Not available",
          "Update checks aren't available in this build."
        )
        return
      case "up-to-date":
        Alert.alert(
          "You're up to date",
          "You're running the latest version of the app."
        )
        return
      case "error":
        Alert.alert(
          "Couldn't check for updates",
          "Check your connection and try again."
        )
        return
      case "downloaded":
        Alert.alert(
          "Update ready",
          "A new version has been downloaded. Restart now to apply it?",
          [
            { text: "Later", style: "cancel" },
            { text: "Restart now", onPress: () => void Updates.reloadAsync() },
          ]
        )
    }
  }

  const [confirmSignOutVisible, setConfirmSignOutVisible] = useState(false)

  const handleSignOut = () => {
    setConfirmSignOutVisible(true)
  }

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
        flagRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
        flagIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
        },
        flagCopy: { flex: 1, gap: 2 },
        flagLabel: { ...typography.section, color: colors.text },
        flagDescription: { ...typography.caption, color: colors.mutedForeground },
        flagUpdated: { ...typography.caption, color: colors.mutedForeground, marginTop: 2 },
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
          ...typography.caption,
          color: colors.mutedForeground,
        },
        footerHint: {
          ...typography.caption,
          color: colors.mutedForeground,
          marginTop: spacing.xs,
        },
      }),
    [colors]
  )

  return (
    <>
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
          <Text style={styles.sectionLabel}>Developer tools</Text>
          <View style={styles.group}>
            <SettingsRow
              icon={Bell}
              label="Notification style preview"
              description="QA tool — not a notification preference"
              onPress={() => router.push("/(ops)/notifications")}
            />
          </View>
        </View>

        {flags && flags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Platform flags</Text>
            <View style={styles.group}>
              {flags.map((flag, index) => {
                const copy = FLAG_COPY[flag.key] ?? {
                  label: flag.key,
                  description: "",
                }
                const updated = formatUpdated(flag)
                return (
                  <View key={flag.key}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.flagRow}>
                      <View style={styles.flagIconWrap}>
                        <Rocket color={colors.primary} size={20} />
                      </View>
                      <View style={styles.flagCopy}>
                        <Text style={styles.flagLabel}>{copy.label}</Text>
                        <Text style={styles.flagDescription}>
                          {copy.description}
                        </Text>
                        <Text style={styles.flagUpdated}>
                          {updated ?? "Never changed · off by default"}
                        </Text>
                      </View>
                      <Switch
                        value={flag.enabled}
                        onValueChange={() => toggleFlag(flag)}
                        disabled={pendingFlagKey === flag.key}
                        trackColor={{ true: colors.primary, false: colors.border }}
                      />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        ) : null}

        <ThemeSettingsSection />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <View style={styles.group}>
            <SettingsRow
              icon={RefreshCcw}
              label="Check for updates"
              description={
                checkingUpdate ? "Checking…" : "Get the latest version now"
              }
              onPress={handleCheckForUpdates}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={Sparkles}
              label="Replay welcome tour"
              description="See the first-run introduction again"
              onPress={() => router.push("/onboarding-replay")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.group}>
            <SettingsRow
              icon={LogOut}
              label="Sign out"
              description="End your ops session"
              onPress={handleSignOut}
              destructive
              showChevron={false}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLabel}>For support</Text>
          <Text style={styles.footerValue}>Connected to: {API_URL}</Text>
          <Text style={styles.footerHint}>Ops mobile · v{version}</Text>
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={confirmSignOutVisible}
        title="Sign out"
        message="You'll need to sign in again to access the ops console."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setConfirmSignOutVisible(false)
          void signOut()
        }}
        onCancel={() => setConfirmSignOutVisible(false)}
      />
    </>
  )
}
