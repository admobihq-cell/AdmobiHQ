"use client"

import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Images,
  MonitorPlay,
  Wallet,
} from "lucide-react"
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
import { ReviewNote } from "@/components/review-note"
import { Fact, FactStrip } from "@/components/ui/fact-strip"
import {
  SectionCard,
  SectionEmpty,
  SectionRow,
  SectionRows,
} from "@/components/ui/section-card"
import { formatBytes, formatDate, formatDateTime, formatLabel } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
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
  const flightLabel =
    data.starts_on && data.ends_on ? `${data.starts_on} → ${data.ends_on}` : "Not scheduled"
  const flightNights =
    data.starts_on && data.ends_on
      ? Math.round(
          (new Date(data.ends_on).getTime() - new Date(data.starts_on).getTime()) / 86_400_000,
        ) + 1
      : null
  const videoCount = data.creatives.filter((c) => c.resource_type === "video").length

  const reviewPanel = (
    <SectionCard title="Review">
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
            rows={4}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            The advertiser sees this text exactly as written, in the app and by email.
          </p>
          <div className="flex flex-col gap-2">
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
            <Button variant="ghost" onClick={() => setDeciding(null)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      ) : canReview ? (
        <div className="flex flex-col gap-2">
          <Button
            loading={submitting}
            loadingText="Approving…"
            onClick={() => void review("approved", "Campaign approved")}
          >
            Approve
          </Button>
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
        </div>
      ) : canUnapprove ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Approved{data.reviewed_at ? ` ${formatDateTime(data.reviewed_at)}` : ""}. Unapproving
            sends it back to the advertiser as changes requested.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setDeciding("unapprove")}
            disabled={submitting}
          >
            Unapprove
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing to review — a campaign is only actionable once the advertiser submits it.
        </p>
      )}
    </SectionCard>
  )

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/campaigns">
            <ArrowLeft aria-hidden />
            <span className="sr-only">Back to campaigns</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            Campaign #{data.id} ·{" "}
            {data.submitted_at
              ? `Submitted ${formatDateTime(data.submitted_at)}`
              : `Created ${formatDateTime(data.created_at)}`}
            {data.reviewed_at ? ` · Reviewed ${formatDateTime(data.reviewed_at)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={data.status} />
          {canUnapprove ? <StatusBadge status={data.flight_phase} /> : null}
        </div>
      </div>

      {data.review_reason ? (
        <ReviewNote
          status={data.status}
          reason={data.review_reason}
          audience="the advertiser"
        />
      ) : null}

      <FactStrip>
        <Fact
          icon={Wallet}
          label="Budget"
          value={data.budget_kes ? `KES ${Number(data.budget_kes).toLocaleString("en-KE")}` : "—"}
          sub={formatLabel(data.objective)}
        />
        <Fact
          icon={CalendarDays}
          label="Flight"
          value={flightLabel}
          sub={flightNights ? `${flightNights} day${flightNights === 1 ? "" : "s"}` : undefined}
        />
        <Fact
          icon={MonitorPlay}
          label="Format"
          value={FORMAT_LABELS[data.format] ?? data.format}
          sub={data.market ?? "Market not set"}
        />
        <Fact
          icon={Images}
          label="Creative"
          value={`${data.creatives.length} file${data.creatives.length === 1 ? "" : "s"}`}
          sub={videoCount > 0 ? `${videoCount} video` : undefined}
        />
      </FactStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Creative" count={data.creatives.length}>
            {data.creatives.length === 0 ? (
              <SectionEmpty>No creative uploaded yet.</SectionEmpty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
          </SectionCard>

          <SectionCard title="Brief" flush>
            <SectionRows>
              <SectionRow label="Objective" value={formatLabel(data.objective)} />
              <SectionRow label="Market" value={data.market ?? "—"} />
              <SectionRow label="Corridors" value={data.corridors ?? "—"} />
              <SectionRow label="Format" value={FORMAT_LABELS[data.format] ?? data.format} />
              <SectionRow label="Flight" value={flightLabel} />
              <SectionRow
                label="Budget"
                value={
                  data.budget_kes ? `KES ${Number(data.budget_kes).toLocaleString("en-KE")}` : "—"
                }
              />
            </SectionRows>
            {data.notes ? (
              <div className="border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm">{data.notes}</p>
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          {reviewPanel}

          <SectionCard title="Advertiser" flush>
            <SectionRows>
              <SectionRow
                label="Company"
                value={
                  data.org_id != null && data.company_name ? (
                    <Link
                      href={`/advertiser-orgs/${data.org_id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {data.company_name}
                    </Link>
                  ) : (
                    (data.company_name ?? "—")
                  )
                }
              />
              <SectionRow label="Created by" value={data.created_by_name ?? "—"} />
              <SectionRow label="Contact" value={data.contact_name ?? "—"} />
              <SectionRow
                label="Email"
                value={
                  data.contact_email ? (
                    <a
                      href={`mailto:${data.contact_email}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {data.contact_email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <SectionRow
                label="Phone"
                value={
                  data.contact_phone ? (
                    <a
                      href={`tel:${data.contact_phone}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {data.contact_phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </SectionRows>
          </SectionCard>

          <SectionCard title="Timeline" flush>
            <SectionRows>
              <SectionRow label="Created" value={formatDate(data.created_at)} />
              <SectionRow
                label="Submitted"
                value={data.submitted_at ? formatDateTime(data.submitted_at) : "—"}
              />
              <SectionRow
                label="Reviewed"
                value={data.reviewed_at ? formatDateTime(data.reviewed_at) : "—"}
              />
              <SectionRow label="Last updated" value={formatDateTime(data.updated_at)} />
            </SectionRows>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
