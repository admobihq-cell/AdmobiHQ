import { useRouter } from "expo-router"
import { useState } from "react"
import { ActivityIndicator, Linking, Text, View } from "react-native"

import { StepScreen } from "@/components/profile-setup/StepScreen"
import { submitDriverProfile, useDriverProfile } from "@/lib/driver-profile"
import { spacing, typography, useThemedStyles } from "@/lib/theme"
import { EXPO_PUBLIC_WEB_URL } from "@/lib/env"

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  profile_photo: "Profile photo",
  kra_pin_certificate: "KRA PIN certificate",
  payout_proof: "Payout proof",
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    label: { ...typography.bodySm, color: c.mutedText },
    value: { ...typography.bodySm, fontWeight: "600" as const, color: c.text },
  }))
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

export default function ReviewStep() {
  const router = useRouter()
  const { profile, loading, getToken } = useDriverProfile()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const styles = useThemedStyles((c) => ({
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    card: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: spacing.md,
    },
    docsList: { gap: spacing.xs },
    docLabel: { ...typography.bodySm, color: c.mutedText },
    legal: { ...typography.caption, color: c.mutedText },
    link: { color: c.primary },
  }))

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await submitDriverProfile(getToken)
      // No dedicated "pending" screen anymore — Settings shows status
      // inline (see DriverVerificationSection), so just head back there.
      router.replace("/(tabs)/settings")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StepScreen
      stepIndex={2}
      title="Review & submit"
      description="Double-check everything before sending it to our team for review."
      onBack={() => router.back()}
      onNext={handleSubmit}
      nextLabel="Submit for review"
      nextLoading={submitting}
      error={error}
    >
      <View style={styles.card}>
        <Row label="Full name" value={profile.full_name ?? "—"} />
        <Row label="Phone" value={profile.phone ?? "—"} />
        <Row label="City" value={profile.city ?? "—"} />
        <Row label="National ID" value={profile.national_id_number ?? "—"} />
        <Row label="KRA PIN" value={profile.kra_pin ?? "—"} />
        <Row
          label="Payout"
          value={
            profile.payout_method === "mpesa"
              ? `M-Pesa · ${profile.payout_mpesa_msisdn ?? "—"}`
              : profile.payout_method === "bank"
                ? `${profile.payout_bank_name ?? "—"} · ${profile.payout_bank_account ?? "—"}`
                : "—"
          }
        />
      </View>

      <View style={styles.docsList}>
        {profile.documents.map((doc) => (
          <Text key={doc.id} style={styles.docLabel}>
            • {DOCUMENT_LABELS[doc.type] ?? doc.type}
          </Text>
        ))}
      </View>

      <Text style={styles.legal}>
        By submitting, you confirm the information above is accurate. See our{" "}
        <Text style={styles.link} onPress={() => void Linking.openURL(`${EXPO_PUBLIC_WEB_URL ?? "https://admobihq.com"}/terms`)}>
          terms
        </Text>{" "}
        for what happens if a document turns out to be false or fraudulent.
      </Text>
    </StepScreen>
  )
}
