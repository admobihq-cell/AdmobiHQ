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
  type View as ViewType,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Send } from "@/components/icons"
import { CategoryIcon, SupportStatusPill } from "@/components/support/support-ui"
import { getSupportCase, replyToSupportCase, type SupportMessage } from "@/lib/support"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const POLL_INTERVAL_MS = 15_000

export default function SupportCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const caseId = Number(id)
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()

  const [subject, setSubject] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const screenRef = useRef<ViewType>(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  const load = useCallback(async () => {
    if (!Number.isFinite(caseId)) return
    try {
      const data = await getSupportCase(caseId)
      if (!mountedRef.current) return
      if (data) {
        setSubject(data.subject)
        setStatus(data.status)
        setCategory(data.category)
        setMessages(data.messages)
      } else {
        setError("This request isn't available on this device.")
      }
    } catch {
      if (!mountedRef.current) return
      setError("Couldn't load this request. Check your connection.")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    mountedRef.current = true
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [load])

  const scrollRef = useRef<ScrollView>(null)

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, paddingBottom: spacing.md },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    headerMeta: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      flex: 1,
    },
    metaText: { ...typography.caption, color: c.mutedForeground },
    bubbleRow: {
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      gap: spacing.xs,
    },
    bubble: {
      maxWidth: "78%" as const,
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
      shadowOpacity: 0,
      elevation: 0,
    },
    bubbleTextCustomer: { ...typography.body, color: c.primaryForeground },
    bubbleTextOps: { ...typography.body, color: c.text },
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
      <View
        ref={screenRef}
        style={{ flex: 1 }}
        onLayout={() => {
          // The persistent AppBar above the tab navigator plus this
          // screen's own Stack header both add to the space above this
          // view, and their combined height varies by device (safe-area
          // insets) — a hardcoded offset left the composer under the
          // keyboard on most phones. Measuring the real on-screen position
          // works for every device and header/AppBar height.
          screenRef.current?.measureInWindow((_x, y) => setKeyboardOffset(y))
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardOffset}
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
              <View style={styles.header}>
                <View style={styles.headerMeta}>
                  {category ? (
                    <CategoryIcon category={category} size={14} color={colors.mutedForeground} />
                  ) : null}
                  <Text style={styles.metaText}>#{caseId}</Text>
                </View>
                {status ? <SupportStatusPill status={status} /> : null}
              </View>

              {messages.map((message, index) => {
                const isDriver = message.author_type === "customer"
                const next = messages[index + 1]
                const endsGroup = next?.author_type !== message.author_type
                const prev = messages[index - 1]
                const grouped = prev?.author_type === message.author_type
                return (
                  <View key={message.id}>
                    <View
                      style={[
                        styles.bubbleRow,
                        { justifyContent: isDriver ? "flex-end" : "flex-start" },
                        { marginTop: index === 0 ? 0 : grouped ? spacing.xs : spacing.md },
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isDriver ? styles.bubbleCustomer : styles.bubbleOps,
                        ]}
                      >
                        <Text style={isDriver ? styles.bubbleTextCustomer : styles.bubbleTextOps}>
                          {message.body}
                        </Text>
                      </View>
                    </View>
                    {endsGroup ? (
                      <Text
                        style={[
                          styles.bubbleMeta,
                          { alignSelf: isDriver ? "flex-end" : "flex-start", marginTop: 4 },
                        ]}
                      >
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

            <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
              <TextInput
                style={styles.input}
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
                accessibilityRole="button"
                accessibilityLabel="Send reply"
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
      </View>
    </>
  )
}
