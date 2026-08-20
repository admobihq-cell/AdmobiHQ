import { useEffect, useState } from "react"
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useAuth } from "@clerk/clerk-expo"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDateTime, formatLabel } from "@workspace/ops-contracts"
import type { DriverProfileReviewInput } from "@workspace/ops-contracts"

import { SkeletonDetailRecord } from "@/components/app/skeleton"
import { StatusChip, type StatusChipVariant } from "@/components/app/status-chip"
import { X } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, DestructiveButton, Field, PrimaryButton, SecondaryButton } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  profile_photo: "Profile photo",
  kra_pin_certificate: "KRA PIN certificate",
  payout_proof: "Payout proof",
}

const STATUS_VARIANTS: Record<string, StatusChipVariant> = {
  submitted: "progress",
  approved: "success",
  rejected: "muted",
  changes_requested: "attention",
}

type Deciding = "rejected" | "changes_requested" | "unapprove" | null

export default function DriverApplicationDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number.parseInt(rawId ?? "", 10)
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    void getToken().then(setToken)
  }, [getToken])

  const detailQuery = useQuery({
    queryKey: ["driver-applications", "detail", id],
    queryFn: () => client.driverApplications.get(id),
    enabled: Number.isFinite(id) && id > 0,
  })
  const data = detailQuery.data ?? null
  usePageHeader(data?.full_name ?? "Driver application", {
    showBack: true,
    backHref: "/(ops)/driver-applications",
  })

  const [deciding, setDeciding] = useState<Deciding>(null)
  const [reason, setReason] = useState("")
  const [approveVisible, setApproveVisible] = useState(false)
  const [lightbox, setLightbox] = useState<{ uri: string; label: string } | null>(null)

  const reviewMutation = useMutation({
    mutationFn: (input: DriverProfileReviewInput) => client.driverApplications.review(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-applications", "detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["driver-applications", "list"] })
      setDeciding(null)
      setReason("")
      setApproveVisible(false)
    },
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
    headerRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, justifyContent: "space-between" as const, gap: spacing.sm },
    headerCopy: { flex: 1, minWidth: 0, gap: 2 },
    name: { ...typography.headline, fontSize: 20, color: c.text },
    submitted: { ...typography.bodySm, color: c.mutedForeground },
    rejectionBox: {
      borderWidth: 1,
      borderColor: c.danger,
      backgroundColor: c.destructiveMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 2,
    },
    rejectionTitle: { ...typography.label, color: c.danger },
    rejectionBody: { ...typography.bodySm, color: c.danger },
    fieldRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    fieldRowLast: { borderBottomWidth: 0 },
    fieldLabel: { ...typography.bodySm, color: c.mutedForeground },
    fieldValue: { ...typography.bodySm, fontWeight: "600" as const, color: c.text, flexShrink: 1, textAlign: "right" as const },
    sectionTitle: { ...typography.section, color: c.text },
    documentsGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    documentTile: { width: "47%" as const, gap: spacing.xs },
    documentLabel: { ...typography.caption, color: c.mutedForeground },
    documentImage: {
      height: 140,
      width: "100%" as const,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.muted,
    },
    noDocs: { ...typography.bodySm, color: c.mutedForeground },
    lightboxBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center" as const, justifyContent: "center" as const },
    lightboxImage: { width: "94%" as const, height: "70%" as const },
    lightboxClose: { position: "absolute" as const, top: 56, right: 20 },
    reasonHint: { ...typography.bodySm, color: c.mutedForeground },
    actionsRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
  }))

  if (detailQuery.isPending || !Number.isFinite(id)) {
    return <SkeletonDetailRecord />
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ApiErrorBanner
            message={detailQuery.error ? formatOpsError(detailQuery.error, API_URL) : "Application not found."}
          />
        </View>
      </View>
    )
  }

  const canReview = data.status === "submitted"
  const canUnapprove = data.status === "approved"
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined

  const payout =
    data.payout_method === "mpesa"
      ? `M-Pesa · ${data.payout_mpesa_msisdn ?? "—"}`
      : data.payout_method === "bank"
        ? `${data.payout_bank_name ?? "—"} · ${data.payout_bank_account ?? "—"}`
        : formatLabel(data.payout_method)

  const fields: Array<[string, string]> = [
    ["Full name", data.full_name ?? "—"],
    ["Phone", data.phone ?? "—"],
    ["City", data.city ?? "—"],
    ["National ID number", data.national_id_number ?? "—"],
    ["KRA PIN", data.kra_pin ?? "—"],
    ["Payout", payout],
  ]

  function submitReview(decision: "approved" | "rejected" | "changes_requested") {
    if (decision !== "approved" && !reason.trim()) return
    reviewMutation.mutate({ decision, reason: reason.trim() || undefined })
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.name}>{data.full_name ?? "Driver application"}</Text>
            <Text style={styles.submitted}>Submitted {formatDateTime(data.submitted_at)}</Text>
          </View>
          <StatusChip label={formatLabel(data.status)} variant={STATUS_VARIANTS[data.status] ?? "muted"} />
        </View>

        {data.rejection_reason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionTitle}>Last review note</Text>
            <Text style={styles.rejectionBody}>{data.rejection_reason}</Text>
          </View>
        ) : null}

        {reviewMutation.error ? (
          <ApiErrorBanner message={formatOpsError(reviewMutation.error, API_URL)} />
        ) : null}

        <Card>
          {fields.map(([label, value], index) => (
            <View key={label} style={[styles.fieldRow, index === fields.length - 1 && styles.fieldRowLast]}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <Text style={styles.fieldValue}>{value}</Text>
            </View>
          ))}
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>Documents</Text>
          {data.documents.length === 0 ? (
            <Text style={styles.noDocs}>No documents uploaded yet.</Text>
          ) : (
            <View style={styles.documentsGrid}>
              {data.documents.map((doc) => {
                const label = DOCUMENT_LABELS[doc.type] ?? doc.type
                const uri = client.driverApplications.documentFileUrl(id, doc.id)
                return (
                  <Pressable
                    key={doc.id}
                    style={styles.documentTile}
                    onPress={() => setLightbox({ uri, label })}
                  >
                    <Text style={styles.documentLabel}>{label}</Text>
                    <Image
                      source={{ uri, headers: authHeaders }}
                      style={styles.documentImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

        {canReview || canUnapprove ? (
          <Card>
            {deciding ? (
              <View style={{ gap: spacing.sm }}>
                <Field
                  value={reason}
                  onChangeText={setReason}
                  placeholder={
                    deciding === "rejected"
                      ? "Why is this application being rejected?"
                      : deciding === "unapprove"
                        ? "Why is this driver being unapproved?"
                        : "What needs to change before this can be approved?"
                  }
                  multiline
                  textAlignVertical="top"
                  editable={!reviewMutation.isPending}
                />
                <View style={styles.actionsRow}>
                  <SecondaryButton
                    label="Cancel"
                    onPress={() => {
                      setDeciding(null)
                      setReason("")
                    }}
                    disabled={reviewMutation.isPending}
                  />
                  <DestructiveButton
                    label={
                      reviewMutation.isPending
                        ? "Submitting…"
                        : deciding === "rejected"
                          ? "Confirm rejection"
                          : deciding === "unapprove"
                            ? "Confirm unapprove"
                            : "Confirm request"
                    }
                    onPress={() =>
                      submitReview(deciding === "unapprove" ? "changes_requested" : deciding)
                    }
                    disabled={reviewMutation.isPending || !reason.trim()}
                  />
                </View>
              </View>
            ) : canReview ? (
              <View style={styles.actionsRow}>
                <SecondaryButton label="Request changes" onPress={() => setDeciding("changes_requested")} />
                <DestructiveButton label="Reject" onPress={() => setDeciding("rejected")} />
                <PrimaryButton
                  label={reviewMutation.isPending ? "Approving…" : "Approve"}
                  onPress={() => setApproveVisible(true)}
                  disabled={reviewMutation.isPending}
                />
              </View>
            ) : (
              <DestructiveButton label="Unapprove" onPress={() => setDeciding("unapprove")} />
            )}
          </Card>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={approveVisible}
        title="Approve this application?"
        confirmLabel={reviewMutation.isPending ? "Approving…" : "Approve"}
        onConfirm={() => submitReview("approved")}
        onCancel={() => setApproveVisible(false)}
      />

      <Modal visible={lightbox !== null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightbox(null)}>
          {lightbox ? (
            <Image
              source={{ uri: lightbox.uri, headers: authHeaders }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable style={styles.lightboxClose} onPress={() => setLightbox(null)} hitSlop={12}>
            <X color="#fff" size={28} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
