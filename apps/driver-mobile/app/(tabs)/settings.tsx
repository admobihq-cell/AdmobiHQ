import { useAuth, useUser } from "@clerk/clerk-expo"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import * as Updates from "expo-updates"
import { useMemo, useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  Call,
  CheckmarkCircle,
  HelpCircle,
  LogOut,
  Mail,
  Pencil,
  Person,
  RefreshCcw,
} from "@/components/icons"
import { SettingsRow } from "@/components/settings/settings-row"
import { UserAvatar } from "@/components/settings/user-avatar"
import { ThemeSettingsSection } from "@/components/theme-settings-section"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { checkForUpdateManually } from "@/lib/bootstrap-splash"
import { EXPO_PUBLIC_API_URL } from "@/lib/env"
import { radius, spacing, typography, useThemeColors } from "@/lib/theme"

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null }
}

/**
 * Same "pick the hook once at module load" pattern used elsewhere — useUser()
 * must never run unless ClerkProvider is mounted.
 */
const useUserIfEnabled = isAuthEnabled() ? useSignedInUser : useNoUser

function useSignOut() {
  const { signOut } = useAuth()
  return signOut
}

function useNoSignOut() {
  return async () => {}
}

const useSignOutIfEnabled = isAuthEnabled() ? useSignOut : useNoSignOut

export default function SettingsScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const version = Constants.expoConfig?.version ?? "0.0.1"
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const { user } = useUserIfEnabled()
  const signOut = useSignOutIfEnabled()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)
  const [signOutVisible, setSignOutVisible] = useState(false)

  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const phone = user?.primaryPhoneNumber?.phoneNumber
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")

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

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setEditing(false)
    } catch {
      Alert.alert("Couldn't save changes", "Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  function startEditing() {
    setFirstName(user?.firstName ?? "")
    setLastName(user?.lastName ?? "")
    setEditing(true)
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
        hero: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: 16,
          backgroundColor: colors.primary,
        },
        heroCopy: { flex: 1, minWidth: 0, gap: 4 },
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
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginLeft: spacing.xs,
          marginRight: spacing.xs,
        },
        sectionLabel: {
          ...typography.caption,
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: "700",
        },
        editToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
        editToggleLabel: { ...typography.label, color: colors.primary, fontWeight: "700" },
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
        footerValue: { ...typography.caption, color: colors.mutedForeground },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
        },
        copy: { flex: 1, gap: 2, minWidth: 0 },
        label: { ...typography.section, color: colors.text },
        value: { ...typography.body, color: colors.mutedForeground },
        valueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
        verified: { color: colors.success },
        input: {
          ...typography.body,
          color: colors.text,
          flex: 1,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          backgroundColor: colors.bg,
        },
        editActions: { flexDirection: "row", gap: spacing.sm, padding: spacing.md },
        saveButton: {
          flex: 1,
          alignItems: "center",
          borderRadius: radius.md,
          paddingVertical: 12,
          backgroundColor: colors.primary,
        },
        saveButtonDisabled: { opacity: 0.6 },
        saveLabel: { ...typography.body, fontWeight: "700", color: colors.primaryForeground },
        cancelButton: {
          flex: 1,
          alignItems: "center",
          borderRadius: radius.md,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        cancelLabel: { ...typography.body, fontWeight: "700", color: colors.text },
      }),
    [colors],
  )

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <UserAvatar imageUrl={user?.imageUrl} name={fullName || undefined} size={56} onPrimary />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {fullName || (user ? "Add your name" : "Driver account")}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {email ?? "Browsing anonymously on this device"}
            </Text>
          </View>
        </View>

        {user ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Personal info</Text>
              {!editing ? (
                <Pressable style={styles.editToggle} onPress={startEditing} accessibilityRole="button">
                  <Pencil color={styles.editToggleLabel.color} size={14} />
                  <Text style={styles.editToggleLabel}>Edit</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.group}>
              {editing ? (
                <>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Person color={styles.label.color} size={20} />
                    </View>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      autoCapitalize="words"
                      editable={!saving}
                    />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <View style={styles.iconWrap} />
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                      autoCapitalize="words"
                      editable={!saving}
                    />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.editActions}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => setEditing(false)}
                      disabled={saving}
                      accessibilityRole="button"
                    >
                      <Text style={styles.cancelLabel}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={() => void handleSave()}
                      disabled={saving}
                      accessibilityRole="button"
                    >
                      <Text style={styles.saveLabel}>{saving ? "Saving…" : "Save"}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Person color={styles.label.color} size={20} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.label}>Name</Text>
                      <Text style={styles.value}>{fullName || "Not set"}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Mail color={styles.label.color} size={20} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.label}>Email</Text>
                      <View style={styles.valueRow}>
                        <Text style={styles.value} numberOfLines={1}>
                          {email ?? "Not set"}
                        </Text>
                        {emailVerified ? (
                          <CheckmarkCircle color={styles.verified.color} size={14} />
                        ) : null}
                      </View>
                    </View>
                  </View>
                  {phone ? (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.row}>
                        <View style={styles.iconWrap}>
                          <Call color={styles.label.color} size={20} />
                        </View>
                        <View style={styles.copy}>
                          <Text style={styles.label}>Phone</Text>
                          <Text style={styles.value}>{phone}</Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </>
              )}
            </View>
          </View>
        ) : null}

        <ThemeSettingsSection />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.group}>
            <SettingsRow
              icon={HelpCircle}
              label="Help & contact"
              description="Send a request to the Admobi team"
              onPress={() => router.push("/support")}
            />
          </View>
        </View>

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

        {user ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.group}>
              <SettingsRow
                icon={LogOut}
                label="Sign out"
                description="End your session on this device"
                onPress={() => setSignOutVisible(true)}
                destructive
                showChevron={false}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Connected to</Text>
          <Text style={styles.footerValue}>{EXPO_PUBLIC_API_URL ?? "http://localhost:3003"}</Text>
          <Text style={styles.footerValue}>Driver app · v{version}</Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={signOutVisible}
        title="Sign out"
        message="You'll need to sign in again to access your deliveries and earnings."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setSignOutVisible(false)
          void signOut()
        }}
        onCancel={() => setSignOutVisible(false)}
      />
    </>
  )
}
