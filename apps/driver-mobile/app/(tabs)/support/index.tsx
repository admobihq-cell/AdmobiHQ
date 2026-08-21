import { useCallback, useState } from "react"
import { useFocusEffect, useRouter } from "expo-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { SkeletonCaseRows } from "@/components/app/skeleton"
import { ChevronRight, HelpCircle } from "@/components/icons"
import { CategoryIcon, SUPPORT_CATEGORIES, SupportStatusPill } from "@/components/support/support-ui"
import { useDriverSession } from "@/lib/auth/use-driver-session"
import { createSupportCase, getStoredIdentity, listMySupportCases } from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function SupportScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const session = useDriverSession()

  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("driver")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  const casesQuery = useQuery({
    queryKey: ["driver-support-cases"],
    queryFn: async () => {
      const identity = await getStoredIdentity()
      if (!identity) return []
      setEmail((current) => current || identity.email)
      setName((current) => current || identity.name)
      return listMySupportCases()
    },
    enabled: session.status === "anonymous",
  })
  const cases = casesQuery.data ?? []
  const loadingCases = casesQuery.isLoading
  const refreshing = casesQuery.isRefetching

  const refetchCases = casesQuery.refetch
  useFocusEffect(
    useCallback(() => {
      void refetchCases()
    }, [refetchCases]),
  )

  const onRefresh = () => void casesQuery.refetch()

  const [submitting, setSubmitting] = useState(false)

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.xl },
    intro: { gap: spacing.xs },
    introTitle: { ...typography.title, color: c.text },
    introBody: { ...typography.bodySm, color: c.mutedForeground },
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
    fieldGroup: { gap: 6 },
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
      backgroundColor: c.bg,
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
    caseIconTile: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    caseCopy: { flex: 1, gap: 2 },
    caseSubject: { ...typography.section, color: c.text },
    caseMeta: { ...typography.caption, color: c.mutedForeground },
    emptyCard: {
      alignItems: "flex-start" as const,
      gap: spacing.xs,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
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
      await queryClient.invalidateQueries({ queryKey: ["driver-support-cases"] })
      router.push(`/support/${created.id}`)
    } catch {
      setError("Couldn't send your request. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Help &amp; contact</Text>
        <Text style={styles.introBody}>
          Earnings, routes, deliveries, or anything else — send a request and
          we&apos;ll reply here, usually within one business day.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>New request</Text>

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
          style={[styles.submit, submitting && styles.submitDisabled]}
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
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionLabel}>My requests</Text>
        {loadingCases ? (
          <SkeletonCaseRows count={5} />
        ) : cases.length === 0 ? (
          <View style={styles.emptyCard}>
            <HelpCircle size={18} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              Requests you send will show up here on this device.
            </Text>
          </View>
        ) : (
          cases.map((item) => (
            <Pressable
              key={item.id}
              style={styles.caseRow}
              onPress={() => router.push(`/support/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.caseIconTile}>
                <CategoryIcon category={item.category} size={16} color={colors.mutedForeground} />
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
          ))
        )}
      </View>
    </ScrollView>
  )
}
