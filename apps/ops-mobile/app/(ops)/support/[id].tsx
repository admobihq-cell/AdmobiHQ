import { useCallback, useEffect, useState } from "react"
import { Stack, useLocalSearchParams } from "expo-router"
import { useUser } from "@clerk/clerk-expo"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  formatLabel,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  type SupportCaseDetailDto,
} from "@workspace/ops-contracts"

import { CheckboxOff, CheckboxOn, Send } from "@/components/icons"
import { StatusChip } from "@/components/app/status-chip"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { formatOpsError } from "@/lib/format-error"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const STATUS_VARIANT: Record<string, "muted" | "attention" | "success" | "default"> = {
  open: "attention",
  pending: "attention",
  resolved: "success",
  closed: "muted",
}

export default function SupportCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const caseId = Number(id)
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const client = useOpsClient()
  const { user } = useUser()

  const [data, setData] = useState<SupportCaseDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await client.support.get(caseId)
      setData(result)
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setLoading(false)
    }
  }, [client, caseId])

  useEffect(() => {
    void load()
  }, [load])

  async function updateCase(patch: { status?: string; priority?: string }) {
    try {
      await client.support.update(caseId, patch as never)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    }
  }

  async function assignToMe() {
    if (!user) return
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: user.id,
        assigned_to_email: user.primaryEmailAddress?.emailAddress ?? null,
      })
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    }
  }

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await client.support.reply(caseId, { body: reply.trim(), internal_note: internalNote })
      setReply("")
      setInternalNote(false)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setSending(false)
    }
  }

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.md },
    metaText: { ...typography.caption, color: c.mutedForeground },
    controlsRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
      alignItems: "center" as const,
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillText: { ...typography.bodySm, color: c.text, fontWeight: "600" as const },
    bubble: {
      maxWidth: "82%" as const,
      padding: spacing.md,
      borderRadius: radius.lg,
      gap: 4,
    },
    bubbleCustomer: {
      alignSelf: "flex-start" as const,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    bubbleOps: {
      alignSelf: "flex-end" as const,
      backgroundColor: c.primary,
    },
    bubbleInternal: {
      alignSelf: "flex-end" as const,
      backgroundColor: "#FEF3C7",
      borderWidth: 1,
      borderColor: "#FCD34D",
    },
    bubbleTextCustomer: { ...typography.body, color: c.text },
    bubbleTextOps: { ...typography.body, color: c.primaryForeground },
    bubbleTextInternal: { ...typography.body, color: "#92400E" },
    bubbleMeta: { ...typography.caption, color: c.mutedForeground },
    composer: {
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bg,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      maxHeight: 120,
      backgroundColor: c.surface,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sendButtonDisabled: { opacity: 0.5 },
    noteRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    noteLabel: { ...typography.caption, color: c.mutedForeground },
  }))

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={{ flex: 1, padding: spacing.lg }}>
        <ApiErrorBanner message={error ?? "Case not found."} onRetry={() => void load()} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: data.subject, headerShown: true }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
          <Text style={styles.metaText}>
            #{data.id} · {data.contact_name} ({data.contact_email})
            {data.contact_phone ? ` · ${data.contact_phone}` : ""}
          </Text>

          {error ? <ApiErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

          <View style={styles.controlsRow}>
            <Pressable style={styles.pill} onPress={() => setStatusPickerOpen(true)}>
              <StatusChip
                label={formatLabel(data.status)}
                variant={STATUS_VARIANT[data.status] ?? "muted"}
              />
            </Pressable>
            <Pressable style={styles.pill} onPress={() => setPriorityPickerOpen(true)}>
              <Text style={styles.pillText}>{formatLabel(data.priority)}</Text>
            </Pressable>
            <Pressable style={styles.pill} onPress={() => void assignToMe()}>
              <Text style={styles.pillText}>
                {data.assigned_to_email ? data.assigned_to_email : "Assign to me"}
              </Text>
            </Pressable>
          </View>

          {data.messages.map((message) => {
            const isCustomer = message.author_type === "customer"
            const bubbleStyle = message.internal_note
              ? styles.bubbleInternal
              : isCustomer
                ? styles.bubbleCustomer
                : styles.bubbleOps
            const textStyle = message.internal_note
              ? styles.bubbleTextInternal
              : isCustomer
                ? styles.bubbleTextCustomer
                : styles.bubbleTextOps
            return (
              <View key={message.id} style={[styles.bubble, bubbleStyle]}>
                <Text style={textStyle}>{message.body}</Text>
                <Text style={styles.bubbleMeta}>
                  {message.internal_note
                    ? "Internal note"
                    : isCustomer
                      ? data.contact_name
                      : (message.author_email ?? "Admobi team")}{" "}
                  · {new Date(message.created_at).toLocaleString()}
                </Text>
              </View>
            )
          })}
        </ScrollView>

        <Pressable
          style={styles.noteRow}
          onPress={() => setInternalNote((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: internalNote }}
        >
          {internalNote ? (
            <CheckboxOn size={18} color={colors.primary} />
          ) : (
            <CheckboxOff size={18} color={colors.mutedForeground} />
          )}
          <Text style={styles.noteLabel}>Internal note (not visible to customer)</Text>
        </Pressable>
        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            style={styles.input}
            value={reply}
            onChangeText={setReply}
            placeholder="Write a reply…"
            multiline
          />
          <Pressable
            style={[styles.sendButton, (sending || !reply.trim()) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !reply.trim()}
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Send size={18} color={colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomSheetPicker
        visible={statusPickerOpen}
        onClose={() => setStatusPickerOpen(false)}
        title="Status"
        options={SUPPORT_STATUSES.map((key) => ({ value: key, label: formatLabel(key) }))}
        value={data.status}
        onSelect={(value) => {
          setStatusPickerOpen(false)
          void updateCase({ status: value })
        }}
      />
      <BottomSheetPicker
        visible={priorityPickerOpen}
        onClose={() => setPriorityPickerOpen(false)}
        title="Priority"
        options={SUPPORT_PRIORITIES.map((key) => ({ value: key, label: formatLabel(key) }))}
        value={data.priority}
        onSelect={(value) => {
          setPriorityPickerOpen(false)
          void updateCase({ priority: value })
        }}
      />
    </>
  )
}
