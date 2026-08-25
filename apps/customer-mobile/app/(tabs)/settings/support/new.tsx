import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Stack, useRouter } from "expo-router"
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { CategoryIcon, SUPPORT_CATEGORIES } from "@/components/support/support-ui"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { useCustomerSession } from "@/lib/auth/use-customer-session"
import { createSupportCase, getStoredIdentity } from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type ClerkSupportProfile = {
  getToken: () => Promise<string | null>
  fullName: string | null
  email: string | null
}

// useAuth()/useUser() require a ClerkProvider ancestor, and app/_layout.tsx
// only mounts ClerkProvider when isAuthEnabled() is true (see
// AuthenticatedApp) — this screen renders under that same conditional tree,
// so calling either hook unconditionally would crash whenever auth is
// disabled. isAuthEnabled() is fixed for the app's lifetime, so pick the hook
// implementation once at module load instead of branching inside a single
// hook body — same pattern as lib/auth/use-customer-session.ts and
// lib/use-push-registration.ts.
function useClerkSupportProfileEnabled(): ClerkSupportProfile {
  const { getToken } = useAuth()
  const { user } = useUser()
  return {
    getToken,
    fullName: user?.fullName ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  }
}

function useClerkSupportProfileDisabled(): ClerkSupportProfile {
  return { getToken: async () => null, fullName: null, email: null }
}

const useClerkSupportProfile = isAuthEnabled()
  ? useClerkSupportProfileEnabled
  : useClerkSupportProfileDisabled

export default function NewSupportRequestScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const session = useCustomerSession()
  const { getToken, fullName, email: clerkEmail } = useClerkSupportProfile()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("general")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Hydrating from AsyncStorage — an external system — is exactly what
    // this effect is for; it can only run once, on mount.
    void getStoredIdentity().then((identity) => {
      if (!identity) return
      setName((current) => current || identity.name)
      setEmail((current) => current || identity.email)
    })
  }, [])

  useEffect(() => {
    if (session.status !== "authenticated") return
    setName((current) => current || fullName || "")
    setEmail((current) => current || clerkEmail || "")
  }, [session.status, fullName, clerkEmail])

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.xl },
    intro: { gap: spacing.xs },
    introBody: { ...typography.bodySm, color: c.mutedForeground },
    fieldGroup: { gap: 6 },
    label: { ...typography.label, color: c.text },
    input: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.surface,
    },
    messageInput: {
      minHeight: 96,
      textAlignVertical: "top" as const,
    },
    chipGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    chip: {
      flexBasis: "30%" as const,
      flexGrow: 1,
      alignItems: "center" as const,
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: {
      backgroundColor: `${c.primary}0F`,
      borderColor: c.primary,
    },
    chipText: {
      ...typography.caption,
      fontWeight: "600" as const,
      color: c.mutedForeground,
    },
    chipTextActive: {
      color: c.primary,
    },
    errorText: {
      ...typography.bodySm,
      color: c.danger,
    },
    submit: {
      alignItems: "center" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
    },
    submitDisabled: { opacity: 0.6 },
    submitText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
  }))

  async function handleSubmit() {
    if (submitting || session.status === "loading") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const token = session.status === "authenticated" ? await getToken() : null
      const created = await createSupportCase(
        {
          contact_name: name.trim(),
          contact_email: email.trim(),
          anonymous_device_id: session.deviceId,
          category,
          subject: subject.trim(),
          message: message.trim(),
        },
        token,
      )
      router.replace(`/settings/support/${created.id}`)
    } catch {
      setError("Couldn't send your request. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "New request" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introBody}>
            We&apos;ll email you at the address below when the team replies.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipGrid}>
            {SUPPORT_CATEGORIES.map((option) => {
              const active = option.value === category
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <option.icon size={18} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="What's this about?"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what's going on"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.submit,
            submitting && styles.submitDisabled,
            pressed && !submitting && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.submitText}>Send request</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  )
}
