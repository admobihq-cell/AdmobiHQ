import { useState } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { useLocalSearchParams } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  SAFETY_TERMINAL_STATUSES,
  formatDateTime,
  formatLabel,
  formatRelativeTime,
} from "@workspace/ops-contracts"

import { Navigate, PhoneCall, ShieldCheck } from "@/components/icons"
import { StatusChip } from "@/components/app/status-chip"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { formatOpsError } from "@/lib/format-error"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)

export default function SosDetailScreen() {
  usePageHeader("SOS")
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number(rawId)
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [resolution, setResolution] = useState("")
  const [resolving, setResolving] = useState(false)

  const incidentQuery = useQuery({
    queryKey: ["safety", "detail", id],
    queryFn: () => client.safety.get(id),
    enabled: Number.isFinite(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL.has(status) ? false : 15_000
    },
  })

  const incident = incidentQuery.data

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["safety"] })
  }

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof client.safety.update>[1]) =>
      client.safety.update(id, body),
    onSuccess: () => {
      setResolving(false)
      setResolution("")
      invalidate()
    },
    onError: (error) => Alert.alert("Didn't save", formatOpsError(error, API_URL)),
  })

  const replyMutation = useMutation({
    mutationFn: () =>
      client.safety.reply(id, { body: reply.trim(), internal_note: internalNote }),
    onSuccess: () => {
      setReply("")
      setInternalNote(false)
      invalidate()
    },
    onError: (error) => Alert.alert("Not sent", formatOpsError(error, API_URL)),
  })

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    ackBanner: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.md,
      borderColor: c.border,
      backgroundColor: c.mutedSurface,
    },
    ackBannerLate: { borderColor: c.destructive, backgroundColor: c.destructiveMuted },
    ackText: { ...typography.label, color: c.text },
    ackTextLate: { ...typography.label, color: c.destructive },
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardTitle: { ...typography.section, color: c.text },
    body: { ...typography.body, color: c.text },
    meta: { ...typography.caption, color: c.mutedForeground },
    row: { flexDirection: "row" as const, gap: spacing.sm, flexWrap: "wrap" as const },
    action: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    actionPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    actionPrimaryText: { ...typography.label, color: c.primaryForeground },
    actionText: { ...typography.label, color: c.text },
    update: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.sm,
      gap: 2,
    },
    updateSystem: { borderColor: "transparent", backgroundColor: c.mutedSurface },
    updateInternal: { borderColor: c.accent, backgroundColor: c.accentSurface },
    input: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      backgroundColor: c.bg,
      padding: spacing.md,
      minHeight: 72,
      textAlignVertical: "top" as const,
    },
    toggle: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    checkMark: { color: c.primaryForeground, fontSize: 12, fontWeight: "700" as const },
  }))

  if (incidentQuery.isPending) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator />
      </View>
    )
  }

  if (incidentQuery.isError || !incident) {
    return (
      <View style={[styles.root, { padding: spacing.lg }]}>
        <ApiErrorBanner
          message={formatOpsError(incidentQuery.error, API_URL)}
          onRetry={() => void incidentQuery.refetch()}
        />
      </View>
    )
  }

  const lat = incident.last_lat ?? incident.reported_lat
  const lng = incident.last_lng ?? incident.reported_lng
  const mapsHref = lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null
  const live = !TERMINAL.has(incident.status)
  const unacked = !incident.acknowledged_at && live

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.ackBanner, unacked && styles.ackBannerLate]}>
        <Text style={unacked ? styles.ackTextLate : styles.ackText}>
          {incident.acknowledged_at
            ? `Acknowledged by ${incident.acknowledged_by_email ?? "ops"} ${formatRelativeTime(incident.acknowledged_at)}`
            : live
              ? "Nobody has acknowledged this yet."
              : formatLabel(incident.status)}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>
            {formatLabel(incident.type)} · #{incident.id}
          </Text>
          <StatusChip label={formatLabel(incident.status)} variant={live ? "attention" : "muted"} />
          <StatusChip label={formatLabel(incident.severity)} variant="default" />
        </View>
        <Text style={styles.body}>
          {incident.description || "No description given — call them."}
        </Text>
        <Text style={styles.meta}>
          Filed {formatDateTime(incident.created_at)}
          {incident.photo_count > 0 ? ` · ${incident.photo_count} photo(s)` : ""}
        </Text>
        {incident.photo_count > 0 ? (
          <Text style={styles.meta}>Open this incident in the ops console to view photos.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Driver</Text>
        <Text style={styles.body}>{incident.driver_name ?? "Unnamed driver"}</Text>
        <View style={styles.row}>
          {incident.driver_phone ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.action, styles.actionPrimary]}
              onPress={() => Linking.openURL(`tel:${incident.driver_phone}`)}
            >
              <PhoneCall color={colors.primaryForeground} size={16} />
              <Text style={styles.actionPrimaryText}>Call {incident.driver_phone}</Text>
            </Pressable>
          ) : (
            <Text style={styles.meta}>No number on file — reply in the thread.</Text>
          )}
          {mapsHref ? (
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              onPress={() => Linking.openURL(mapsHref)}
            >
              <Navigate color={colors.text} size={16} />
              <Text style={styles.actionText}>Open map</Text>
            </Pressable>
          ) : null}
        </View>
        {!mapsHref ? (
          <Text style={styles.meta}>
            No location — the device had no fix. Ask the driver where they are.
          </Text>
        ) : null}
      </View>

      {live ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>
          <View style={styles.row}>
            {!incident.acknowledged_at ? (
              <Pressable
                accessibilityRole="button"
                style={[styles.action, styles.actionPrimary]}
                disabled={updateMutation.isPending}
                onPress={() => updateMutation.mutate({ status: "acknowledged" })}
              >
                <Text style={styles.actionPrimaryText}>Acknowledge</Text>
              </Pressable>
            ) : null}
            {incident.status !== "in_progress" ? (
              <Pressable
                accessibilityRole="button"
                style={styles.action}
                disabled={updateMutation.isPending}
                onPress={() => updateMutation.mutate({ status: "in_progress" })}
              >
                <Text style={styles.actionText}>In progress</Text>
              </Pressable>
            ) : null}
            {!resolving ? (
              <Pressable
                accessibilityRole="button"
                style={styles.action}
                onPress={() => setResolving(true)}
              >
                <ShieldCheck color={colors.text} size={16} />
                <Text style={styles.actionText}>Resolve…</Text>
              </Pressable>
            ) : null}
          </View>

          {resolving ? (
            <>
              <TextInput
                style={styles.input}
                value={resolution}
                onChangeText={setResolution}
                multiline
                placeholder="What happened and how it was handled — the driver sees this."
                placeholderTextColor={colors.mutedForeground}
              />
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  // The API rejects an empty note with a 400; blocking it here
                  // keeps that from surfacing as a failure alert.
                  disabled={!resolution.trim() || updateMutation.isPending}
                  style={[
                    styles.action,
                    styles.actionPrimary,
                    (!resolution.trim() || updateMutation.isPending) && { opacity: 0.5 },
                  ]}
                  onPress={() =>
                    updateMutation.mutate({ status: "resolved", resolution: resolution.trim() })
                  }
                >
                  <Text style={styles.actionPrimaryText}>Resolve</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => setResolving(false)}
                >
                  <Text style={styles.actionText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      ) : incident.resolution ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resolution</Text>
          <Text style={styles.body}>{incident.resolution}</Text>
          <Text style={styles.meta}>
            {incident.resolved_by_email} · {formatDateTime(incident.resolved_at)}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Updates</Text>
        {incident.updates.length === 0 ? (
          <Text style={styles.meta}>Nothing yet.</Text>
        ) : (
          incident.updates.map((update) => (
            <View
              key={update.id}
              style={[
                styles.update,
                update.author_type === "system" && styles.updateSystem,
                update.internal_note && styles.updateInternal,
              ]}
            >
              {update.author_type !== "system" ? (
                <Text style={styles.meta}>
                  {update.author_type === "driver"
                    ? (incident.driver_name ?? "Driver")
                    : (update.author_email ?? "Ops")}
                  {update.internal_note ? " · internal" : ""} ·{" "}
                  {formatRelativeTime(update.created_at)}
                </Text>
              ) : null}
              <Text style={update.author_type === "system" ? styles.meta : styles.body}>
                {update.body}
              </Text>
            </View>
          ))
        )}

        <TextInput
          style={styles.input}
          value={reply}
          onChangeText={setReply}
          multiline
          placeholder="Reply to the driver…"
          placeholderTextColor={colors.mutedForeground}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: internalNote }}
          style={styles.toggle}
          onPress={() => setInternalNote((v) => !v)}
        >
          <View style={[styles.checkbox, internalNote && styles.checkboxOn]}>
            {internalNote ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.meta}>Internal note — the driver won&apos;t see this</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!reply.trim() || replyMutation.isPending}
          style={[
            styles.action,
            styles.actionPrimary,
            (!reply.trim() || replyMutation.isPending) && { opacity: 0.5 },
          ]}
          onPress={() => replyMutation.mutate()}
        >
          <Text style={styles.actionPrimaryText}>Send</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
