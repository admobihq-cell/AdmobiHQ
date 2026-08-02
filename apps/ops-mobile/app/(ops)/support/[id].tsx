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

import { Call, CheckboxOff, CheckboxOn, Lock, Send, UserCircle, X } from "@/components/icons"
import { CategoryIcon } from "@/components/support/category-icon"
import { StatusChip } from "@/components/app/status-chip"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { formatOpsError } from "@/lib/format-error"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const STATUS_VARIANT: Record<string, "muted" | "attention" | "progress" | "success"> = {
  open: "attention",
  pending: "progress",
  resolved: "success",
  closed: "muted",
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
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
  const [updating, setUpdating] = useState(false)
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
    setUpdating(true)
    try {
      await client.support.update(caseId, patch as never)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setUpdating(false)
    }
  }

  async function assignToMe() {
    if (!user) return
    setUpdating(true)
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: user.id,
        assigned_to_email: user.primaryEmailAddress?.emailAddress ?? null,
      })
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setUpdating(false)
    }
  }

  async function unassign() {
    setUpdating(true)
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: null,
        assigned_to_email: null,
      } as never)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setUpdating(false)
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
    header: { flexDirection: "row" as const, gap: spacing.sm, alignItems: "flex-start" as const },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: { ...typography.caption, fontWeight: "700" as const, color: c.mutedForeground },
    headerCopy: { flex: 1, gap: 2 },
    contactLine: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    metaText: { ...typography.caption, color: c.mutedForeground },
    phoneRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 3 },
    controlsRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
      alignItems: "center" as const,
    },
    pill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillText: { ...typography.bodySm, color: c.text, fontWeight: "600" as const },
    assigneePill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
      paddingVertical: 6,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: `${c.primary}0F`,
    },
    unassignButton: { padding: 6 },
    bubbleRow: { flexDirection: "row" as const, alignItems: "flex-end" as const, gap: spacing.xs },
    avatarSm: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarSmText: { fontSize: 10, fontWeight: "700" as const },
    bubble: {
      maxWidth: "76%" as const,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.lg,
      gap: 4,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    bubbleCustomer: {
      alignSelf: "flex-start" as const,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    bubbleOps: {
      alignSelf: "flex-end" as const,
      backgroundColor: c.primary,
    },
    bubbleInternal: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 6,
      alignSelf: "flex-end" as const,
      backgroundColor: c.accent,
      borderWidth: 1,
      borderColor: c.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    bubbleTextCustomer: { ...typography.body, color: c.text },
    bubbleTextOps: { ...typography.body, color: c.primaryForeground },
    bubbleTextInternal: { ...typography.body, color: c.text, flexShrink: 1 },
    bubbleMeta: { ...typography.caption, color: c.mutedForeground, paddingHorizontal: 4 },
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
    inputInternal: { borderColor: c.primary, backgroundColor: c.accent },
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
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(data.contact_name)}</Text>
            </View>
            <View style={styles.headerCopy}>
              <View style={styles.contactLine}>
                <Text style={styles.metaText}>#{data.id}</Text>
                <Text style={styles.metaText}>·</Text>
                <Text style={styles.metaText}>{data.contact_name}</Text>
                <Text style={styles.metaText}>·</Text>
                <Text style={styles.metaText}>{data.contact_email}</Text>
              </View>
              {data.contact_phone ? (
                <View style={styles.phoneRow}>
                  <Call size={12} color={colors.mutedForeground} />
                  <Text style={styles.metaText}>{data.contact_phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {error ? <ApiErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

          <View style={styles.controlsRow}>
            <Pressable style={styles.pill} onPress={() => setStatusPickerOpen(true)} disabled={updating}>
              <StatusChip
                label={formatLabel(data.status)}
                variant={STATUS_VARIANT[data.status] ?? "muted"}
              />
            </Pressable>
            <Pressable style={styles.pill} onPress={() => setPriorityPickerOpen(true)} disabled={updating}>
              <Text style={styles.pillText}>{formatLabel(data.priority)}</Text>
            </Pressable>
            <View style={styles.pill}>
              <CategoryIcon category={data.category} size={13} color={colors.mutedForeground} />
              <Text style={styles.pillText}>{formatLabel(data.category)}</Text>
            </View>
            {data.assigned_to_email ? (
              <View style={styles.assigneePill}>
                <UserCircle size={13} color={colors.mutedForeground} />
                <Text style={styles.pillText}>{data.assigned_to_email}</Text>
                <Pressable
                  style={styles.unassignButton}
                  onPress={() => void unassign()}
                  disabled={updating}
                  accessibilityLabel="Unassign"
                >
                  <X size={13} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.pill} onPress={() => void assignToMe()} disabled={updating}>
                <UserCircle size={13} color={colors.mutedForeground} />
                <Text style={styles.pillText}>Assign to me</Text>
              </Pressable>
            )}
          </View>

          {data.messages.map((message, index) => {
            const isCustomer = message.author_type === "customer"
            const prev = data.messages[index - 1]
            const grouped =
              prev !== undefined &&
              prev.author_type === message.author_type &&
              prev.internal_note === message.internal_note
            const next = data.messages[index + 1]
            const endsGroup =
              next === undefined ||
              next.author_type !== message.author_type ||
              next.internal_note !== message.internal_note

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
            const onLeft = isCustomer && !message.internal_note

            return (
              <View
                key={message.id}
                style={{ marginTop: index === 0 ? 0 : grouped ? spacing.xs : spacing.md }}
              >
                <View
                  style={[
                    styles.bubbleRow,
                    { justifyContent: onLeft ? "flex-start" : "flex-end" },
                  ]}
                >
                  {onLeft ? (
                    <View
                      style={[
                        styles.avatarSm,
                        { backgroundColor: colors.muted, opacity: grouped ? 0 : 1 },
                      ]}
                    >
                      <Text style={[styles.avatarSmText, { color: colors.mutedForeground }]}>
                        {initials(data.contact_name)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.bubble, bubbleStyle]}>
                    {message.internal_note ? (
                      <View style={{ marginTop: 3 }}>
                        <Lock size={12} color={colors.mutedForeground} />
                      </View>
                    ) : null}
                    <Text style={textStyle}>{message.body}</Text>
                  </View>
                </View>
                {endsGroup ? (
                  <Text
                    style={[
                      styles.bubbleMeta,
                      { alignSelf: onLeft ? "flex-start" : "flex-end", marginTop: 4 },
                    ]}
                  >
                    {message.internal_note
                      ? "Internal note · "
                      : isCustomer
                        ? ""
                        : `${message.author_email ?? "Admobi team"} · `}
                    {new Date(message.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                ) : null}
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
            style={[styles.input, internalNote && styles.inputInternal]}
            value={reply}
            onChangeText={setReply}
            placeholder="Write a reply…"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (sending || !reply.trim()) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !reply.trim()}
            accessibilityLabel={internalNote ? "Add internal note" : "Send reply"}
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : internalNote ? (
              <Lock size={18} color={colors.primaryForeground} />
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
