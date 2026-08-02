import { useCallback, useEffect, useRef, useState } from "react"
import { Stack, useLocalSearchParams } from "expo-router"
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

import { Send } from "@/components/icons"
import { getSupportCase, replyToSupportCase, type SupportMessage } from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Awaiting you",
  resolved: "Resolved",
  closed: "Closed",
}

const POLL_INTERVAL_MS = 15_000

export default function SupportCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const caseId = Number(id)
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()

  const [subject, setSubject] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(caseId)) return
    try {
      const data = await getSupportCase(caseId)
      if (data) {
        setSubject(data.subject)
        setStatus(data.status)
        setMessages(data.messages)
      } else {
        setError("This request isn't available on this device.")
      }
    } catch {
      setError("Couldn't load this request. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  const scrollRef = useRef<ScrollView>(null)

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.md },
    metaText: { ...typography.caption, color: c.mutedForeground },
    bubble: {
      maxWidth: "82%" as const,
      padding: spacing.md,
      borderRadius: radius.lg,
      gap: 4,
    },
    bubbleCustomer: {
      alignSelf: "flex-end" as const,
      backgroundColor: c.primary,
      borderBottomRightRadius: radius.sm,
    },
    bubbleOps: {
      alignSelf: "flex-start" as const,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomLeftRadius: radius.sm,
    },
    bubbleTextCustomer: { ...typography.body, color: c.primaryForeground },
    bubbleTextOps: { ...typography.body, color: c.text },
    bubbleMetaCustomer: { ...typography.caption, color: "rgba(255,255,255,0.75)" },
    bubbleMetaOps: { ...typography.caption, color: c.mutedForeground },
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
    errorText: { ...typography.bodySm, color: c.danger, padding: spacing.lg },
  }))

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await replyToSupportCase(caseId, reply.trim())
      setReply("")
      await load()
      scrollRef.current?.scrollToEnd({ animated: true })
    } catch {
      setError("Couldn't send your reply. Try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: subject ?? "Request" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : error && messages.length === 0 ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.container}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {status ? (
                <Text style={styles.metaText}>
                  Status: {STATUS_LABELS[status] ?? status}
                </Text>
              ) : null}
              {messages.map((message) => {
                const isCustomer = message.author_type === "customer"
                return (
                  <View
                    key={message.id}
                    style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleOps]}
                  >
                    <Text style={isCustomer ? styles.bubbleTextCustomer : styles.bubbleTextOps}>
                      {message.body}
                    </Text>
                    <Text style={isCustomer ? styles.bubbleMetaCustomer : styles.bubbleMetaOps}>
                      {isCustomer ? "You" : "Admobi team"} ·{" "}
                      {new Date(message.created_at).toLocaleString()}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

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
          </>
        )}
      </KeyboardAvoidingView>
    </>
  )
}
