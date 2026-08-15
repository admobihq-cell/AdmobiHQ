import { useEffect, useState } from "react"
import { Image, Pressable, Text, View } from "react-native"
import type { DriverDocumentDto, DriverProfileDto } from "@workspace/ops-contracts"

import { driverDocumentFileUrl } from "@/lib/driver-profile"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

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

function DocumentThumb({
  doc,
  getToken,
}: {
  doc: DriverDocumentDto
  getToken: () => Promise<string | null>
}) {
  const [uri, setUri] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const styles = useThemedStyles((c) => ({
    label: { ...typography.caption, color: c.mutedText, marginBottom: spacing.xs },
    image: { width: "100%" as const, height: 120, borderRadius: radius.md, backgroundColor: c.mutedSurface },
    retry: {
      width: "100%" as const,
      height: 120,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: "dashed" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 2,
    },
    retryText: { ...typography.caption, color: c.mutedText },
    retryLabel: { ...typography.caption, color: c.text, fontWeight: "600" as const },
  }))

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(driverDocumentFileUrl(doc.id), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(15000),
        })
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          return
        }
        const blob = await res.blob()
        const reader = new FileReader()
        reader.onload = () => {
          if (!cancelled) setUri(reader.result as string)
        }
        reader.onerror = () => {
          if (!cancelled) setFailed(true)
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        console.error("[SubmittedInfoView] failed to load document preview:", error)
        if (!cancelled) setFailed(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, attempt])

  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={styles.label}>{DOCUMENT_LABELS[doc.type] ?? doc.type}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : failed ? (
        <Pressable style={styles.retry} onPress={() => setAttempt((n) => n + 1)}>
          <Text style={styles.retryText}>Couldn&apos;t load preview</Text>
          <Text style={styles.retryLabel}>Tap to retry</Text>
        </Pressable>
      ) : (
        <View style={styles.image} />
      )}
    </View>
  )
}

/** Read-only view of what a driver has submitted, shown in Settings
 * regardless of review status — mirrors driver-web's SubmittedInfoView. */
export function SubmittedInfoView({
  profile,
  getToken,
}: {
  profile: DriverProfileDto
  getToken: () => Promise<string | null>
}) {
  const styles = useThemedStyles((c) => ({
    card: { borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: spacing.md },
    docsRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.md, marginTop: spacing.md },
  }))

  return (
    <View>
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
      {profile.documents.length > 0 ? (
        <View style={styles.docsRow}>
          {profile.documents.map((doc) => (
            <DocumentThumb key={doc.id} doc={doc} getToken={getToken} />
          ))}
        </View>
      ) : null}
    </View>
  )
}
