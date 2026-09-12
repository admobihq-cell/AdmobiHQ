"use client"

import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  checkCreativeForFormat,
  specsForFormat,
  type CampaignDto,
  type CampaignFormat,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
import { ImageLightbox } from "@workspace/ui/components/image-lightbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { StatusBadge } from "@/components/status-badge"
import { CampaignDetailSkeleton } from "@/components/campaign-detail-skeleton"
import { formatBytes, formatDateTime, formatLabel } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

/**
 * A reviewer has to judge whether artwork will actually render on the panel.
 * Measuring it by eye is not a review, so each tile states its dimensions and
 * whether they match the campaign's format — computed with the same checker
 * the upload route gated on.
 */
function SpecLine({
  format,
  width,
  height,
}: {
  format: CampaignFormat
  width: number | null
  height: number | null
}) {
  if (!width || !height) {
    return <span className="text-muted-foreground">Dimensions unknown</span>
  }
  const check = checkCreativeForFormat(format, width, height)
  const expected = specsForFormat(format)
    .map((spec) => spec.aspectLabel)
    .join(" or ")
  const ratio = (width / height).toFixed(2)

  return (
    <span
      className={
        check.level === "fail"
          ? "flex items-center gap-1 text-destructive"
          : check.level === "warn"
            ? "flex items-center gap-1 text-amber-700 dark:text-amber-400"
            : "flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
      }
    >
      {check.level === "fail" ? (
        <AlertTriangle className="size-3" aria-hidden />
      ) : (
        <CheckCircle2 className="size-3" aria-hidden />
      )}
      {width} x {height} · {ratio}:1
      {check.level === "fail" ? ` — expected ${expected}` : ""}
      {check.level === "warn" ? " — below panel canvas" : ""}
    </span>
  )
}

function CreativePreview({
  campaignId,
  creative,
  format,
}: {
  campaignId: number
  creative: CampaignDto["creatives"][number]
  format: CampaignFormat
}) {
  const client = useOpsClient()
  const { getToken } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const isVideo = creative.resource_type === "video"

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setFailed(false)

    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(client.campaigns.creativeFileUrl(campaignId, creative.id), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          // Video is bigger than a driver document, so this budget is looser
          // than the 15s that route's preview uses.
          signal: AbortSignal.timeout(45000),
        })
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          return
        }
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setUrl(objectUrl)
      } catch (error) {
        console.error("[CreativePreview] failed to load creative:", error)
        if (!cancelled) setFailed(true)
      }
    }
    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [campaignId, creative.id, getToken, client, attempt])

  return (
    <div className="space-y-1.5">
      {url ? (
        isVideo ? (
          <video src={url} controls className="h-44 w-full rounded-lg border border-border bg-black object-contain" />
        ) : (
          <ImageLightbox src={url} alt={creative.original_filename ?? "Creative"}>
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated blob, not a remote asset */}
            <img
              src={url}
              alt={creative.original_filename ?? "Creative"}
              className="h-44 w-full rounded-lg border border-border object-contain"
            />
          </ImageLightbox>
        )
      ) : failed ? (
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="flex h-44 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
        >
          <span>Couldn&apos;t load preview</span>
          <span className="font-medium text-foreground">Click to retry</span>
        </button>
      ) : (
        <Skeleton className="h-44 w-full rounded-lg" />
      )}

      <div className="space-y-0.5 text-xs">
        <SpecLine format={format} width={creative.width} height={creative.height} />
        <p className="text-muted-foreground">
          {creative.content_type} · {formatBytes(creative.size_bytes)}
          {creative.duration_seconds ? ` · ${Number(creative.duration_seconds).toFixed(1)}s` : ""}
          {creative.slot !== "all" ? ` · ${formatLabel(creative.slot)}` : ""}
        </p>
      </div>
    </div>
  )
}

export function CampaignDetailView({ campaignId }: { campaignId: number }) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const [data, setData] = useState<CampaignDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState<"rejected" | "changes_requested" | "unapprove" | null>(
    null,
  )
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await client.campaigns.get(campaignId))
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [client, campaignId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function review(
    decision: "approved" | "rejected" | "changes_requested",
    successMessage: string,
  ) {
    if (decision !== "approved" && !reason.trim()) {
      toast.error("A reason is required")
      return
    }
    setSubmitting(true)
    try {
      await client.campaigns.review(campaignId, {
        decision,
        reason: reason.trim() || undefined,
      })
      toast.success(successMessage)
      setDeciding(null)
      setReason("")
      // Keep the list's cached status from going stale for up to staleTime.
      void queryClient.invalidateQueries({ queryKey: ["ops-campaigns"] })
      await load()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !data) return <CampaignDetailSkeleton />

  const format = data.format as CampaignFormat
  const canReview = data.status === "submitted"
  const canUnapprove = data.status === "approved"

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/campaigns">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            Submitted {formatDateTime(data.submitted_at)}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {data.review_reason ? (
        <div className="max-w-2xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Last review note (visible to the advertiser)</p>
          <p className="mt-1 whitespace-pre-line">{data.review_reason}</p>
        </div>
      ) : null}

      <div className="max-w-2xl rounded-xl border bg-card p-4 shadow-none">
        <DetailRow
          label="Company"
          value={
            data.org_id != null && data.company_name ? (
              <Link href={`/advertiser-orgs/${data.org_id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {data.company_name}
              </Link>
            ) : (
              (data.company_name ?? "—")
            )
          }
        />
        <DetailRow label="Advertiser" value={data.contact_email ?? "—"} />
        <DetailRow label="Contact name" value={data.contact_name ?? "—"} />
        <DetailRow label="Phone" value={data.contact_phone ?? "—"} />
        <DetailRow label="Market" value={data.market ?? "—"} />
        <DetailRow label="Corridors" value={data.corridors ?? "—"} />
        <DetailRow label="Format" value={FORMAT_LABELS[data.format] ?? data.format} />
        <DetailRow label="Objective" value={formatLabel(data.objective)} />
        <DetailRow
          label="Flight"
          value={
            data.starts_on && data.ends_on ? `${data.starts_on} → ${data.ends_on}` : "Not scheduled"
          }
        />
        <DetailRow
          label="Budget"
          value={data.budget_kes ? `KES ${Number(data.budget_kes).toLocaleString("en-KE")}` : "—"}
        />
        <DetailRow label="Notes" value={data.notes ?? "—"} />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Creative</p>
        {data.creatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No creative uploaded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.creatives.map((creative) => (
              <CreativePreview
                key={creative.id}
                campaignId={campaignId}
                creative={creative}
                format={format}
              />
            ))}
          </div>
        )}
      </div>

      {canReview || canUnapprove ? (
        <div className="max-w-2xl space-y-3 rounded-xl border bg-card p-4 shadow-none">
          {deciding ? (
            <div className="space-y-3">
              <Textarea
                placeholder={
                  deciding === "rejected"
                    ? "Why is this campaign being rejected?"
                    : deciding === "unapprove"
                      ? "Why is this campaign being unapproved?"
                      : "What needs to change before this can be approved?"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                The advertiser sees this text exactly as written, in the app and by email.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeciding(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  loading={submitting}
                  loadingText="Submitting…"
                  onClick={() =>
                    void review(
                      deciding === "unapprove" ? "changes_requested" : deciding,
                      deciding === "rejected"
                        ? "Campaign rejected"
                        : deciding === "unapprove"
                          ? "Campaign unapproved"
                          : "Changes requested",
                    )
                  }
                >
                  Confirm{" "}
                  {deciding === "rejected"
                    ? "rejection"
                    : deciding === "unapprove"
                      ? "unapprove"
                      : "request"}
                </Button>
              </div>
            </div>
          ) : canReview ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeciding("changes_requested")}
                disabled={submitting}
              >
                Request changes
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeciding("rejected")}
                disabled={submitting}
              >
                Reject
              </Button>
              <Button
                loading={submitting}
                loadingText="Approving…"
                onClick={() => void review("approved", "Campaign approved")}
              >
                Approve
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setDeciding("unapprove")}
                disabled={submitting}
              >
                Unapprove
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
