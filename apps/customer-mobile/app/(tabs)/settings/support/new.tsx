import { useEffect, useState } from "react"
import { Stack, useRouter } from "expo-router"
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { CategoryIcon, SUPPORT_CATEGORIES } from "@/components/support/support-ui"
import { useCustomerSession } from "@/lib/auth/use-customer-session"
import { createSupportCase, getStoredIdentity } from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function NewSupportRequestScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const session = useCustomerSession()

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
    if (submitting || session.status !== "anonymous") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = await createSupportCase({
        contact_name: name.trim(),
        contact_email: email.trim(),
        anonymous_device_id: session.deviceId,
        category,
        subject: subject.trim(),
        message: message.trim(),
      })
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
