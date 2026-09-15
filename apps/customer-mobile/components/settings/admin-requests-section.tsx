import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, Pressable, Text, TextInput, View } from "react-native"

import type { AdvertiserAdminRequestDto } from "@workspace/ops-contracts"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { listAdminRequests, requestAdminAccess, reviewAdminRequest } from "@/lib/org-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const KEY = ["customer-org-admin-requests"] as const

/**
 * Expo twin of customer-web's <AdminRequestsCard>. Owners review; everyone
 * else can raise one. Promotion is owner-only, so this is the sanctioned route
 * for a member who needs more access.
 */
export function AdminRequestsSection({ isOwner }: { isOwner: boolean }) {
  const getToken = useTokenGetter()
  const queryClient = useQueryClient()
  const colors = useThemeColors()
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState<Record<number, string>>({})

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => listAdminRequests(getToken),
    retry: false,
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: KEY })
    await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
    await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
  }

  const create = useMutation({
    mutationFn: () => requestAdminAccess(getToken, { reason: reason.trim() }),
    onSuccess: async () => {
      setReason("")
      await refresh()
      Alert.alert("Request sent", "An admin will review it.")
    },
    onError: (err: Error) => Alert.alert("Couldn't send", err.message),
  })

  const review = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "deny" }) =>
      reviewAdminRequest(getToken, id, { decision, note: notes[id]?.trim() || undefined }),
    onSuccess: async (_r, { decision }) => {
      await refresh()
      Alert.alert(decision === "approve" ? "Admin access granted" : "Request declined")
    },
    onError: (err: Error) => Alert.alert("Couldn't save", err.message),
  })

  const styles = useThemedStyles((c) => ({
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: { ...typography.body, fontWeight: "700" as const, color: c.text },
    hint: { ...typography.caption, color: c.mutedForeground },
    body: { ...typography.body, color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: c.text,
      minHeight: 72,
      textAlignVertical: "top" as const,
    },
    button: {
      marginTop: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: 10,
      alignItems: "center" as const,
      backgroundColor: c.primary,
    },
    buttonText: { fontWeight: "700" as const, color: c.primaryForeground },
    secondary: {
      paddingVertical: spacing.sm,
      borderRadius: 10,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryText: { fontWeight: "700" as const, color: c.text },
    requestRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    disabled: { opacity: 0.6 },
  }))

  const requests: AdvertiserAdminRequestDto[] = query.data ?? []
  const pending = requests.filter((r) => r.status === "pending")

  if (!isOwner) {
    const mine = pending[0]
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Need admin access?</Text>
        {mine ? (
          <>
            <Text style={styles.hint}>Your request is awaiting review.</Text>
            <Text style={styles.body}>{mine.reason}</Text>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Ask an admin to promote you and say why — they&apos;ll see your reason.
            </Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="I need to add our media buyer and submit campaigns while Jane is away."
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable
              style={[
                styles.button,
                (reason.trim().length < 10 || create.isPending) && styles.disabled,
              ]}
              disabled={reason.trim().length < 10 || create.isPending}
              onPress={() => create.mutate()}
            >
              <Text style={styles.buttonText}>
                {create.isPending ? "Sending…" : "Request admin access"}
              </Text>
            </Pressable>
          </>
        )}

        {requests
          .filter((r) => r.status !== "pending")
          .slice(0, 3)
          .map((r) => (
            <View key={r.id} style={styles.requestRow}>
              <Text style={styles.hint}>
                {r.status === "approved" ? "Approved" : "Declined"} by{" "}
                {r.reviewedByName ?? "an admin"}
              </Text>
              {r.reviewNote ? <Text style={styles.body}>{r.reviewNote}</Text> : null}
            </View>
          ))}
      </View>
    )
  }

  if (!pending.length) return null

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Admin access requests ({pending.length})</Text>
      <Text style={styles.hint}>
        Approving makes them a full admin — team, billing and roles included.
      </Text>

      {pending.map((request) => (
        <View key={request.id} style={styles.requestRow}>
          <Text style={styles.body}>{request.name ?? request.email ?? "A teammate"}</Text>
          <Text style={styles.hint}>{request.reason}</Text>
          <TextInput
            style={styles.input}
            value={notes[request.id] ?? ""}
            onChangeText={(text) => setNotes((prev) => ({ ...prev, [request.id]: text }))}
            multiline
            placeholder="Add a note (required if you decline)"
            placeholderTextColor={colors.mutedForeground}
          />
          <Pressable
            style={[styles.button, review.isPending && styles.disabled]}
            disabled={review.isPending}
            onPress={() => review.mutate({ id: request.id, decision: "approve" })}
          >
            <Text style={styles.buttonText}>Make admin</Text>
          </Pressable>
          <Pressable
            style={[
              styles.secondary,
              (review.isPending || !(notes[request.id] ?? "").trim()) && styles.disabled,
            ]}
            disabled={review.isPending || !(notes[request.id] ?? "").trim()}
            onPress={() => review.mutate({ id: request.id, decision: "deny" })}
          >
            <Text style={styles.secondaryText}>Decline</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}
