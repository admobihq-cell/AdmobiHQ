import { useCallback, useState } from "react"
import { useFocusEffect, useRouter } from "expo-router"
import { Stack } from "expo-router"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ChevronRight } from "@/components/icons"
import { useCustomerSession } from "@/lib/auth/use-customer-session"
import {
  createSupportCase,
  getStoredIdentity,
  listMySupportCases,
  type SupportCase,
} from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "billing", label: "Billing" },
  { value: "campaign", label: "Campaign" },
  { value: "technical", label: "Technical" },
  { value: "driver", label: "Driver" },
]

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Awaiting you",
  resolved: "Resolved",
  closed: "Closed",
}

export default function SupportSettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const session = useCustomerSession()

  const [cases, setCases] = useState<SupportCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("general")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const identity = await getStoredIdentity()
      if (identity && session.status === "anonymous") {
        setEmail((current) => current || identity.email)
        setName((current) => current || identity.name)
        const items = await listMySupportCases(identity.email, session.deviceId)
        setCases(items)
      }
    } catch {
      // best-effort — an empty list is a safe fallback
    } finally {
      setLoadingCases(false)
    }
  }, [session])

  useFocusEffect(
    useCallback(() => {
      void refreshCases()
    }, [refreshCases]),
  )

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.lg },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    card: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.md,
    },
    label: {
      ...typography.label,
      color: c.text,
    },
    input: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    messageInput: {
      minHeight: 96,
      textAlignVertical: "top" as const,
    },
    chipRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      ...typography.bodySm,
      color: c.text,
    },
    chipTextActive: {
      color: c.primaryForeground,
      fontWeight: "700" as const,
    },
    submit: {
      marginTop: spacing.xs,
      alignSelf: "flex-start" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    submitDisabled: { opacity: 0.6 },
    submitText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
    errorText: {
      ...typography.bodySm,
      color: c.danger,
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
    caseCopy: { flex: 1, gap: 2 },
    caseSubject: { ...typography.section, color: c.text },
    caseMeta: { ...typography.caption, color: c.mutedForeground },
    emptyText: { ...typography.bodySm, color: c.mutedForeground },
  }))

  async function handleSubmit() {
    if (submitting) return
    if (session.status !== "anonymous") return
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
      setSubject("")
      setMessage("")
      await refreshCases()
      router.push(`/settings/support/${created.id}`)
    } catch {
      setError("Couldn't send your request. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Help & contact" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>New request</Text>

          <View>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              autoCapitalize="words"
            />
          </View>

          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((option) => {
                const active = option.value === category
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCategory(option.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="What's this about?"
            />
          </View>

          <View>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what's going on"
              multiline
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.submit, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Send request</Text>
            )}
          </Pressable>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>My requests</Text>
          {loadingCases ? (
            <ActivityIndicator />
          ) : cases.length === 0 ? (
            <Text style={styles.emptyText}>
              Requests you send will show up here on this device.
            </Text>
          ) : (
            cases.map((item) => (
              <Pressable
                key={item.id}
                style={styles.caseRow}
                onPress={() => router.push(`/settings/support/${item.id}`)}
              >
                <View style={styles.caseCopy}>
                  <Text style={styles.caseSubject}>{item.subject}</Text>
                  <Text style={styles.caseMeta}>
                    #{item.id} · {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </>
  )
}
