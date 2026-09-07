import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { useLocalSearchParams } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { formatLabel, SAFETY_TERMINAL_STATUSES } from "@workspace/ops-contracts"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Send } from "@/components/icons"
import {
  cancelIncident,
  getIncident,
  replyToIncident,
  uploadIncidentPhoto,
  type PendingPhoto,
} from "@/lib/sos"
import { useIncidentPing } from "@/lib/use-incident-ping"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function statusLine(status: string, acknowledgedAt: string | null): string {
  if (status === "cancelled") return "You cancelled this report."
  if (status === "resolved") return "This report has been resolved."
  if (acknowledgedAt) return `Ops acknowledged ${relativeTime(acknowledgedAt)}`
  return "Sent. Waiting for someone to pick this up…"
}

export default function SosTrackingScreen() {
  const params = useLocalSearchParams<{ id: string; pending?: string }>()
  const id = Number(params.id)
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const [reply, setReply] = useState("")
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [uploading, setUploading] = useState(0)

  const authedToken = useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("Not signed in")
    return token
  }, [getToken])

  const incidentQuery = useQuery({
    queryKey: ["sos", id],
    queryFn: async () => getIncident(await authedToken(), id),
    enabled: Number.isFinite(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL.has(status) ? false : 20_000
    },
  })

  const incident = incidentQuery.data

  useIncidentPing(
    Number.isFinite(id) ? id : null,
    incident?.status ?? null,
    useCallback(() => getToken(), [getToken]),
  )

  // Photos chosen on the submit screen upload here, one call each, so ops was
  // already alerted before any of this ran. Guarded by a ref so a re-render or
  // a refetch can't start the uploads twice.
  const uploadedPending = useRef(false)
  useEffect(() => {
    if (uploadedPending.current || !params.pending || !Number.isFinite(id)) return
    uploadedPending.current = true

    let pending: PendingPhoto[] = []
    try {
      pending = JSON.parse(params.pending) as PendingPhoto[]
    } catch {
      return
    }
    if (pending.length === 0) return

    void (async () => {
      setUploading(pending.length)
      for (const photo of pending) {
        try {
          await uploadIncidentPhoto(await authedToken(), id, photo)
        } catch (error) {
          // One failed photo must not stop the rest, and must never surface as
          // "your report failed" — the report is already filed.
          console.error("[sos] photo upload failed", error)
        } finally {
          setUploading((n) => n - 1)
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["sos", id] })
    })()
  }, [params.pending, id, authedToken, queryClient])

  const replyMutation = useMutation({
    mutationFn: async (body: string) => replyToIncident(await authedToken(), id, body),
    onSuccess: () => {
      setReply("")
      void queryClient.invalidateQueries({ queryKey: ["sos", id] })
    },
    onError: () => Alert.alert("Not sent", "Couldn't send that message. Try again."),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => cancelIncident(await authedToken(), id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sos", id] }),
    onError: () => Alert.alert("Not cancelled", "Couldn't cancel the report. Try again."),
  })

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, gap: spacing.lg },
    banner: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    bannerLive: { borderColor: c.destructive, backgroundColor: c.destructiveMuted },
    eyebrow: { ...typography.eyebrow, color: c.mutedForeground },
    status: { ...typography.headline, color: c.foreground },
    meta: { ...typography.caption, color: c.mutedForeground },
    sectionTitle: { ...typography.section, color: c.foreground },
    bubble: {
      borderRadius: radius.lg,
      padding: spacing.md,
      maxWidth: "88%" as const,
      gap: 2,
    },
    fromOps: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignSelf: "flex-start" as const },
    fromDriver: { backgroundColor: c.primary, alignSelf: "flex-end" as const },
    fromSystem: { backgroundColor: c.muted, alignSelf: "center" as const, maxWidth: "100%" as const },
    bubbleText: { ...typography.body, color: c.foreground },
    bubbleTextOwn: { ...typography.body, color: c.primaryForeground },
    bubbleMeta: { ...typography.caption, color: c.mutedForeground },
    systemText: { ...typography.caption, color: c.mutedForeground, textAlign: "center" as const },
    replyRow: { flexDirection: "row" as const, gap: spacing.sm, alignItems: "flex-end" as const },
    replyInput: {
      flex: 1,
      ...typography.body,
      color: c.foreground,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxHeight: 120,
    },
    sendButton: {
      backgroundColor: c.primary,
      borderRadius: radius.full,
      width: 44,
      height: 44,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: c.destructive,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center" as const,
    },
    cancelText: { ...typography.label, color: c.destructive },
  }))

  if (incidentQuery.isPending) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!incident) {
    return (
      <View style={[styles.screen, { padding: spacing.md }]}>
        <Text style={styles.status}>We couldn&apos;t load this report.</Text>
        <Text style={styles.meta}>Pull down to retry, or file a new one from the SOS button.</Text>
      </View>
    )
  }

  const live = !TERMINAL.has(incident.status)

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.banner, live && styles.bannerLive]}>
          <Text style={styles.eyebrow}>{formatLabel(incident.type)}</Text>
          <Text style={styles.status}>{statusLine(incident.status, incident.acknowledged_at)}</Text>
          <Text style={styles.meta}>
            Filed {relativeTime(incident.created_at)}
            {incident.photo_count > 0 ? ` · ${incident.photo_count} photo(s)` : ""}
            {uploading > 0 ? ` · uploading ${uploading}…` : ""}
          </Text>
          {incident.reported_lat === null ? (
            <Text style={styles.meta}>
              Location wasn&apos;t available — tell us where you are in a message below.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>Updates</Text>
          {incident.updates.length === 0 ? (
            <Text style={styles.meta}>No updates yet.</Text>
          ) : (
            incident.updates.map((update) =>
              update.author_type === "system" ? (
                <View key={update.id} style={[styles.bubble, styles.fromSystem]}>
                  <Text style={styles.systemText}>{update.body}</Text>
                </View>
              ) : (
                <View
                  key={update.id}
                  style={[
                    styles.bubble,
                    update.author_type === "driver" ? styles.fromDriver : styles.fromOps,
                  ]}
                >
                  <Text
                    style={
                      update.author_type === "driver" ? styles.bubbleTextOwn : styles.bubbleText
                    }
                  >
                    {update.body}
                  </Text>
                  <Text style={styles.bubbleMeta}>{relativeTime(update.created_at)}</Text>
                </View>
              ),
            )
          )}
        </View>

        {live ? (
          <>
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                value={reply}
                onChangeText={setReply}
                placeholder="Add detail for the team…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={4000}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                disabled={!reply.trim() || replyMutation.isPending}
                onPress={() => replyMutation.mutate(reply.trim())}
                style={[styles.sendButton, (!reply.trim() || replyMutation.isPending) && { opacity: 0.5 }]}
              >
                <Send color={colors.primaryForeground} size={20} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              style={styles.cancelButton}
              onPress={() => setConfirmCancel(true)}
            >
              <Text style={styles.cancelText}>This was a false alarm — cancel</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmCancel}
        title="Cancel this report?"
        message="The team will stop responding to it. You can always file a new one."
        confirmLabel="Cancel report"
        destructive
        onConfirm={() => {
          setConfirmCancel(false)
          cancelMutation.mutate()
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  )
}
