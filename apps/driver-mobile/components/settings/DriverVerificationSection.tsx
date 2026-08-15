import { useRouter } from "expo-router"
import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"

import { ChevronRight } from "@/components/icons"
import { SubmittedInfoView } from "@/components/settings/SubmittedInfoView"
import { useDriverProfile } from "@/lib/driver-profile"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const STATUS_COPY: Record<string, { label: string; bg: string; fg: string; description: string }> = {
  approved: {
    label: "Verified",
    bg: "#D1FAE5",
    fg: "#065F46",
    description: "Your account is verified — you have full access to the app.",
  },
  submitted: {
    label: "Under review",
    bg: "#FEF3C7",
    fg: "#92400E",
    description: "We're reviewing your documents — this usually takes a day or two.",
  },
  rejected: {
    label: "Action needed",
    bg: "#FEE2E2",
    fg: "#991B1B",
    description: "Your application needs changes before it can be approved.",
  },
  changes_requested: {
    label: "Action needed",
    bg: "#FFEDD5",
    fg: "#9A3412",
    description: "We requested some changes before your application can be approved.",
  },
  draft: {
    label: "Incomplete",
    bg: "#E5E7EB",
    fg: "#374151",
    description: "Complete your profile so we can verify your account.",
  },
}

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

export function DriverVerificationSection() {
  const { profile, loading, getToken } = useDriverProfile()
  const router = useRouter()
  const [showInfo, setShowInfo] = useState(false)

  const styles = useThemedStyles((c) => ({
    section: { gap: spacing.sm },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing.md,
      gap: spacing.md,
    },
    statusRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    statusLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, flexShrink: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
    badgeLabel: { ...typography.caption, fontWeight: "700" as const },
    description: { ...typography.bodySm, color: c.mutedForeground },
    button: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    buttonLabel: { ...typography.bodySm, fontWeight: "700" as const, color: c.primaryForeground },
    reasonBox: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.destructiveMuted,
      backgroundColor: c.destructiveMuted,
      padding: spacing.sm,
      gap: 2,
    },
    reasonTitle: { ...typography.caption, fontWeight: "700" as const, color: c.destructive },
    reasonText: { ...typography.bodySm, color: c.destructive },
    toggleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
    },
    toggleLabel: { ...typography.bodySm, fontWeight: "600" as const, color: c.text },
  }))

  if (loading || !profile) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Driver verification</Text>
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      </View>
    )
  }

  const copy = STATUS_COPY[profile.status] ?? STATUS_COPY.draft!
  const canEdit = EDITABLE_STATUSES.has(profile.status)
  const hasSubmittedInfo = Boolean(profile.full_name || profile.documents.length > 0)

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Driver verification</Text>
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View style={[styles.badge, { backgroundColor: copy.bg }]}>
              <Text style={[styles.badgeLabel, { color: copy.fg }]}>{copy.label}</Text>
            </View>
          </View>
          {canEdit ? (
            <Pressable style={styles.button} onPress={() => router.push("/profile-setup")}>
              <Text style={styles.buttonLabel}>
                {profile.status === "draft" ? "Complete profile" : "Continue"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.description}>{copy.description}</Text>

        {profile.rejection_reason &&
        (profile.status === "rejected" || profile.status === "changes_requested") ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>
              {profile.status === "rejected" ? "Why it was rejected" : "What needs to change"}
            </Text>
            <Text style={styles.reasonText}>{profile.rejection_reason}</Text>
          </View>
        ) : null}

        {hasSubmittedInfo ? (
          <View>
            <Pressable style={styles.toggleRow} onPress={() => setShowInfo((v) => !v)}>
              <Text style={styles.toggleLabel}>View your submitted information</Text>
              <ChevronRight size={16} />
            </Pressable>
            {showInfo ? (
              <View style={{ marginTop: spacing.md }}>
                <SubmittedInfoView profile={profile} getToken={getToken} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}
