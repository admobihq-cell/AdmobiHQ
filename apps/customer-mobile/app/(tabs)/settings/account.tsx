import { useAuth, useUser } from "@clerk/clerk-expo"
import { Stack } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  Call,
  CheckmarkCircle,
  Laptop,
  LogOut,
  LogoGoogle,
  Mail,
  Pencil,
  Person,
  Phone,
  Shield,
} from "@/components/icons"
import { SettingsRow } from "@/components/settings/settings-row"
import { UserAvatar } from "@/components/settings/user-avatar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

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

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return { sessionId: null as string | null, signOut: async () => {} }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

function formatMemberSince(date: Date | null | undefined): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)
}

function formatRelativeTime(date: Date): string {
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return "Active now"
  if (diffMin < 60) return `Active ${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `Active ${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `Active ${diffDay}d ago`
}

type SessionActivity = {
  browserName?: string
  deviceType?: string
  isMobile?: boolean
  city?: string
  country?: string
}

function sessionDeviceLabel(activity: SessionActivity | undefined): string {
  if (!activity) return "Unknown device"
  if (activity.browserName) {
    return `${activity.browserName} · ${activity.isMobile ? "Mobile" : "Desktop"}`
  }
  if (activity.isMobile) return "Mobile app"
  return activity.deviceType || "Unknown device"
}

function sessionLocation(activity: SessionActivity | undefined): string | null {
  if (!activity) return null
  return [activity.city, activity.country].filter(Boolean).join(", ") || null
}

type SessionRow = {
  id: string
  isCurrent: boolean
  label: string
  location: string | null
  lastActiveAt: Date
  isMobile: boolean
  revoke: () => Promise<unknown>
}

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUserIfEnabled()
  const { sessionId, signOut } = useAuthIfEnabled()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)
  const [signOutVisible, setSignOutVisible] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const phone = user?.primaryPhoneNumber?.phoneNumber
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const googleAccount = user?.externalAccounts?.find((a) => a.provider === "google")
  const memberSince = formatMemberSince(user?.createdAt)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user
      .getSessions()
      .then((list) => {
        if (cancelled) return
        setSessions(
          list.map((session) => ({
            id: session.id,
            isCurrent: session.id === sessionId,
            label: sessionDeviceLabel(session.latestActivity),
            location: sessionLocation(session.latestActivity),
            lastActiveAt: session.lastActiveAt,
            isMobile: Boolean(session.latestActivity?.isMobile),
            revoke: () => session.revoke(),
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
    return () => {
      cancelled = true
    }
  }, [user, sessionId])

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg },
    hero: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: 16,
      backgroundColor: c.primary,
    },
    heroCopy: { flex: 1, gap: 4, minWidth: 0 },
    heroTitle: { fontSize: 18, fontWeight: "700" as const, color: c.primaryForeground },
    heroSubtitle: {
      ...typography.caption,
      color: "rgba(250, 249, 247, 0.85)",
      lineHeight: 18,
    },
    heroMeta: {
      ...typography.caption,
      color: "rgba(250, 249, 247, 0.7)",
      lineHeight: 16,
    },
    section: { gap: spacing.sm },
    sectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginLeft: spacing.xs,
      marginRight: spacing.xs,
    },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    editToggle: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
    editToggleLabel: { ...typography.label, color: c.primary, fontWeight: "700" as const },
    group: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 60 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    copy: { flex: 1, gap: 2, minWidth: 0 },
    label: { ...typography.section, color: c.text },
    value: { ...typography.body, color: c.mutedForeground },
    valueRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    verified: { color: c.success },
    currentTag: {
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    signOutSmall: { ...typography.label, color: c.destructive, fontWeight: "700" as const },
    skeleton: {
      height: 52,
      borderRadius: 10,
      backgroundColor: c.muted,
      marginHorizontal: spacing.md,
      marginVertical: spacing.xs,
    },
    input: {
      ...typography.body,
      color: c.text,
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    editActions: { flexDirection: "row" as const, gap: spacing.sm, padding: spacing.md },
    saveButton: {
      flex: 1,
      alignItems: "center" as const,
      borderRadius: radius.md,
      paddingVertical: 12,
      backgroundColor: c.primary,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveLabel: { ...typography.body, fontWeight: "700" as const, color: c.primaryForeground },
    cancelButton: {
      flex: 1,
      alignItems: "center" as const,
      borderRadius: radius.md,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    cancelLabel: { ...typography.body, fontWeight: "700" as const, color: c.text },
    anonCard: {
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.xs,
    },
    anonTitle: { ...typography.headline, color: c.text },
    anonBody: { ...typography.body, color: c.mutedForeground },
  }))

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

  async function handleRevoke(row: SessionRow) {
    setRevokingId(row.id)
    try {
      await row.revoke()
      setSessions((prev) => prev?.filter((s) => s.id !== row.id) ?? prev)
    } catch {
      Alert.alert("Couldn't sign out that device", "Check your connection and try again.")
    } finally {
      setRevokingId(null)
    }
  }

  function startEditing() {
    setFirstName(user?.firstName ?? "")
    setLastName(user?.lastName ?? "")
    setEditing(true)
  }

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile & sign-in" }} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.anonCard}>
            <Text style={styles.anonTitle}>Browsing anonymously</Text>
            <Text style={styles.anonBody}>
              You&apos;re using this device without an account — no sign-in required yet.
            </Text>
          </View>
        </ScrollView>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: "Profile & sign-in" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <UserAvatar imageUrl={user.imageUrl} name={fullName || email} size={56} onPrimary />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {fullName || "Add your name"}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {email ?? "Signed in"}
            </Text>
            {memberSince ? (
              <Text style={styles.heroMeta}>Member since {memberSince}</Text>
            ) : null}
          </View>
        </View>

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
                      {emailVerified ? <CheckmarkCircle color={styles.verified.color} size={14} /> : null}
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sign-in methods</Text>
          <View style={styles.group}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Mail color={styles.label.color} size={20} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.label}>Email code</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {email}
                  {emailVerified ? " · Verified" : ""}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <LogoGoogle color={styles.label.color} size={18} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.label}>Google</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {googleAccount
                    ? `Connected · ${googleAccount.emailAddress ?? email ?? ""}`
                    : "Not connected"}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Shield color={styles.label.color} size={18} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.label}>Two-factor authentication</Text>
                <Text style={styles.value}>
                  {user.twoFactorEnabled ? "On" : "Off"} — passwordless sign-in has no password to
                  pair it with yet.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Active sessions</Text>
          <View style={styles.group}>
            {sessions === null ? (
              <>
                <View style={styles.skeleton} />
                <View style={styles.skeleton} />
              </>
            ) : (
              sessions.map((session, index) => {
                const Icon = session.isMobile ? Phone : Laptop
                return (
                  <View key={session.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.row}>
                      <View style={styles.iconWrap}>
                        <Icon color={styles.label.color} size={18} />
                      </View>
                      <View style={styles.copy}>
                        <View style={styles.valueRow}>
                          <Text style={styles.label} numberOfLines={1}>
                            {session.label}
                          </Text>
                          {session.isCurrent ? (
                            <Text style={styles.currentTag}>This device</Text>
                          ) : null}
                        </View>
                        <Text style={styles.value} numberOfLines={1}>
                          {[session.location, formatRelativeTime(session.lastActiveAt)]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                      {!session.isCurrent ? (
                        <Pressable
                          onPress={() => void handleRevoke(session)}
                          disabled={revokingId === session.id}
                          hitSlop={8}
                        >
                          <Text style={styles.signOutSmall}>
                            {revokingId === session.id ? "…" : "Sign out"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </View>

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
      </ScrollView>

      <ConfirmDialog
        visible={signOutVisible}
        title="Sign out"
        message="You'll need to sign in again to access your campaigns."
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
