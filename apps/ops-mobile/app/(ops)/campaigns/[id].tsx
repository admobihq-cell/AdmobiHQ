import { useEffect, useState } from "react"
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { Image } from "expo-image"
import { useLocalSearchParams } from "expo-router"
import { useAuth } from "@clerk/clerk-expo"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  checkCreativeForFormat,
  formatBytes,
  formatDateTime,
  formatLabel,
  specsForFormat,
} from "@workspace/ops-contracts"
import type {
  CampaignCreativeDto,
  CampaignFormat,
  CampaignReviewInput,
} from "@workspace/ops-contracts"

import { SkeletonDetailRecord } from "@/components/app/skeleton"
import { StatusChip, type StatusChipVariant } from "@/components/app/status-chip"
import { PlayCircle, X } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, DestructiveButton, Field, PrimaryButton, SecondaryButton } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

const STATUS_VARIANTS: Record<string, StatusChipVariant> = {
  submitted: "progress",
  approved: "success",
  rejected: "muted",
  changes_requested: "attention",
  cancelled: "muted",
  draft: "muted",
}

type Deciding = "rejected" | "changes_requested" | "unapprove" | null

/** File facts a reviewer needs regardless of whether the bytes render here:
 * dimensions against the panel spec, size, duration, and which face it plays
 * on. Computed with the same checker the upload route gated on. */
function creativeMetaLines(
  creative: CampaignCreativeDto,
  format: CampaignFormat,
): { spec: string; specLevel: "ok" | "warn" | "fail"; file: string } {
  const parts = [creative.content_type, formatBytes(creative.size_bytes)]
  if (creative.duration_seconds) parts.push(`${Number(creative.duration_seconds).toFixed(1)}s`)
  if (creative.slot !== "all") parts.push(formatLabel(creative.slot))

  if (!creative.width || !creative.height) {
    return { spec: "Dimensions unknown", specLevel: "fail", file: parts.join(" · ") }
  }

  const check = checkCreativeForFormat(format, creative.width, creative.height)
  const ratio = (creative.width / creative.height).toFixed(2)
  const expected = specsForFormat(format)
    .map((spec) => spec.aspectLabel)
    .join(" or ")
  const suffix =
    check.level === "fail"
      ? ` — expected ${expected}`
      : check.level === "warn"
        ? " — below panel canvas"
        : ""

  return {
    spec: `${creative.width} x ${creative.height} · ${ratio}:1${suffix}`,
    specLevel: check.level,
    file: parts.join(" · "),
  }
}

export default function CampaignDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number.parseInt(rawId ?? "", 10)
  const client = useOpsClient()
  const colors = useThemeColors()
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    void getToken().then(setToken)
  }, [getToken])

  const detailQuery = useQuery({
    queryKey: ["campaigns", "detail", id],
    queryFn: () => client.campaigns.get(id),
    enabled: Number.isFinite(id) && id > 0,
  })
  const data = detailQuery.data ?? null
  usePageHeader(data?.name ?? "Campaign", {
    showBack: true,
    backHref: "/(ops)/campaigns",
  })

  const [deciding, setDeciding] = useState<Deciding>(null)
  const [reason, setReason] = useState("")
  const [approveVisible, setApproveVisible] = useState(false)
  const [lightbox, setLightbox] = useState<{ uri: string; label: string } | null>(null)

  const reviewMutation = useMutation({
    mutationFn: (input: CampaignReviewInput) => client.campaigns.review(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns", "detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] })
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
    creativesGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    creativeTile: { width: "47%" as const, gap: spacing.xs },
    creativeImage: {
      height: 140,
      width: "100%" as const,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.muted,
    },
    videoTile: {
      height: 140,
      width: "100%" as const,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.xs,
    },
    videoHint: { ...typography.caption, color: c.mutedForeground, textAlign: "center" as const, paddingHorizontal: spacing.sm },
    specOk: { ...typography.caption, color: c.success },
    specWarn: { ...typography.caption, color: c.primary },
    specFail: { ...typography.caption, color: c.danger },
    creativeFile: { ...typography.caption, color: c.mutedForeground },
    noCreatives: { ...typography.bodySm, color: c.mutedForeground },
    lightboxBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center" as const, justifyContent: "center" as const },
    lightboxImage: { width: "94%" as const, height: "70%" as const },
    lightboxClose: { position: "absolute" as const, top: 56, right: 20 },
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
            message={detailQuery.error ? formatOpsError(detailQuery.error, API_URL) : "Campaign not found."}
          />
        </View>
      </View>
    )
  }

  const format = data.format as CampaignFormat
  const canReview = data.status === "submitted"
  const canUnapprove = data.status === "approved"
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined

  const fields: Array<[string, string]> = [
    ["Advertiser", data.contact_email ?? "—"],
    ["Contact name", data.contact_name ?? "—"],
    ["Phone", data.contact_phone ?? "—"],
    ["Market", data.market ?? "—"],
    ["Corridors", data.corridors ?? "—"],
    ["Format", FORMAT_LABELS[data.format] ?? data.format],
    ["Objective", formatLabel(data.objective)],
    [
      "Flight",
      data.starts_on && data.ends_on ? `${data.starts_on} → ${data.ends_on}` : "Not scheduled",
    ],
    ["Budget", data.budget_kes ? `KES ${Number(data.budget_kes).toLocaleString("en-KE")}` : "—"],
    ["Notes", data.notes ?? "—"],
  ]

  function submitReview(decision: "approved" | "rejected" | "changes_requested") {
    if (decision !== "approved" && !reason.trim()) return
    reviewMutation.mutate({ decision, reason: reason.trim() || undefined })
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={detailQuery.isRefetching}
            onRefresh={() => void detailQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.name}>{data.name}</Text>
            <Text style={styles.submitted}>Submitted {formatDateTime(data.submitted_at)}</Text>
          </View>
          <StatusChip label={formatLabel(data.status)} variant={STATUS_VARIANTS[data.status] ?? "muted"} />
        </View>

        {data.review_reason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionTitle}>Last review note (visible to the advertiser)</Text>
            <Text style={styles.rejectionBody}>{data.review_reason}</Text>
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
          <Text style={styles.sectionTitle}>Creative</Text>
          {data.creatives.length === 0 ? (
            <Text style={styles.noCreatives}>No creative uploaded yet.</Text>
          ) : (
            <View style={styles.creativesGrid}>
              {data.creatives.map((creative) => {
                const meta = creativeMetaLines(creative, format)
                const label = creative.original_filename ?? `Creative ${creative.id}`
                const uri = client.campaigns.creativeFileUrl(id, creative.id)
                const specStyle =
                  meta.specLevel === "fail"
                    ? styles.specFail
                    : meta.specLevel === "warn"
                      ? styles.specWarn
                      : styles.specOk

                return (
                  <View key={creative.id} style={styles.creativeTile}>
                    {creative.resource_type === "video" ? (
                      // No video player ships in this app, and adding one is a
                      // native dependency and a new dev-client build. The tile
                      // states everything a reviewer can check here and says
                      // plainly where the footage can be watched, rather than
                      // implying it has been seen.
                      <View style={styles.videoTile}>
                        <PlayCircle color={colors.mutedForeground} size={32} />
                        <Text style={styles.videoHint}>Video — watch on ops web</Text>
                      </View>
                    ) : (
                      <Pressable onPress={() => setLightbox({ uri, label })}>
                        <Image
                          source={{ uri, headers: authHeaders }}
                          style={styles.creativeImage}
                          contentFit="cover"
                          transition={150}
                        />
                      </Pressable>
                    )}
                    <Text style={specStyle}>{meta.spec}</Text>
                    <Text style={styles.creativeFile} numberOfLines={2}>
                      {meta.file}
                    </Text>
                  </View>
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
                      ? "Why is this campaign being rejected?"
                      : deciding === "unapprove"
                        ? "Why is this campaign being unapproved?"
                        : "What needs to change before this can be approved?"
                  }
                  multiline
                  textAlignVertical="top"
                  editable={!reviewMutation.isPending}
                />
                <Text style={styles.creativeFile}>
                  The advertiser sees this text exactly as written, in the app and by email.
                </Text>
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
        title="Approve this campaign?"
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
              contentFit="contain"
              transition={150}
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
