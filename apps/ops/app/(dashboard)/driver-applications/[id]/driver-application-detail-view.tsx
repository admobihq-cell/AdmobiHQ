"use client"

import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, FileCheck2, MapPin, Phone, Wallet } from "lucide-react"
import { toast } from "sonner"
import type { DriverProfileDto } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
import { ImageLightbox } from "@workspace/ui/components/image-lightbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { StatusBadge } from "@/components/status-badge"
import { DriverApplicationDetailSkeleton } from "@/components/driver-application-detail-skeleton"
import { ReviewNote } from "@/components/review-note"
import { Fact, FactStrip } from "@/components/ui/fact-strip"
import {
  SectionCard,
  SectionEmpty,
  SectionRow,
  SectionRows,
} from "@/components/ui/section-card"
import { formatDate, formatDateTime, formatLabel } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  profile_photo: "Profile photo",
  kra_pin_certificate: "KRA PIN certificate",
  payout_proof: "Payout proof",
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "??"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase()
}

function payoutSummary(data: DriverProfileDto): string {
  if (data.payout_method === "mpesa") return data.payout_mpesa_msisdn ?? "M-Pesa"
  if (data.payout_method === "bank") return data.payout_bank_account ?? "Bank transfer"
  return formatLabel(data.payout_method)
}

function DocumentPreview({
  applicationId,
  documentId,
  label,
}: {
  applicationId: number
  documentId: number
  label: string
}) {
  const client = useOpsClient()
  const { getToken } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setFailed(false)

    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(client.driverApplications.documentFileUrl(applicationId, documentId), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(15000),
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
        console.error("[DocumentPreview] failed to load document:", error)
        if (!cancelled) setFailed(true)
      }
    }
    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [applicationId, documentId, getToken, client, attempt])

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {url ? (
        <ImageLightbox src={url} alt={label}>
          <img src={url} alt={label} className="h-40 w-full rounded-lg border border-border object-cover" />
        </ImageLightbox>
      ) : failed ? (
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="flex h-40 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
        >
          <span>Couldn&apos;t load preview</span>
          <span className="font-medium text-foreground">Click to retry</span>
        </button>
      ) : (
        <Skeleton className="h-40 w-full rounded-lg" />
      )}
    </div>
  )
}

export function DriverApplicationDetailView({ applicationId }: { applicationId: number }) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const [data, setData] = useState<DriverProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState<"rejected" | "changes_requested" | "unapprove" | null>(
    null,
  )
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await client.driverApplications.get(applicationId)
      setData(result)
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [client, applicationId])

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
      await client.driverApplications.review(applicationId, {
        decision,
        reason: reason.trim() || undefined,
      })
      toast.success(successMessage)
      setDeciding(null)
      setReason("")
      // This detail view predates the TanStack Query migration and wasn't
      // itself converted, but the list at /driver-applications now caches
      // under ["ops-driver-applications"] (see driver-applications-view.tsx)
      // — without this, a review decision here would leave that list
      // showing the pre-decision status for up to staleTime.
      void queryClient.invalidateQueries({ queryKey: ["ops-driver-applications"] })
      await load()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !data) {
    return <DriverApplicationDetailSkeleton />
  }

  const canReview = data.status === "submitted"
  const canUnapprove = data.status === "approved"
  const name = data.full_name ?? "Driver application"

  const reviewPanel = (
    <SectionCard title="Review">
      {deciding ? (
        <div className="space-y-3">
          <Textarea
            placeholder={
              deciding === "rejected"
                ? "Why is this application being rejected?"
                : deciding === "unapprove"
                  ? "Why is this driver being unapproved?"
                  : "What needs to change before this can be approved?"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            The driver sees this text exactly as written, in the app and by email.
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
                    ? "Application rejected"
                    : deciding === "unapprove"
                      ? "Driver unapproved"
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
            onClick={() => void review("approved", "Application approved")}
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
            sends the application back to the driver as changes requested.
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
          Nothing to review — an application is only actionable once the driver submits it.
        </p>
      )}
    </SectionCard>
  )

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/driver-applications">
            <ArrowLeft aria-hidden />
            <span className="sr-only">Back to driver applications</span>
          </Link>
        </Button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
          {monogram(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            Application #{data.id} ·{" "}
            {data.submitted_at
              ? `Submitted ${formatDateTime(data.submitted_at)}`
              : `Created ${formatDateTime(data.created_at)}`}
            {data.reviewed_at ? ` · Reviewed ${formatDateTime(data.reviewed_at)}` : ""}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {data.rejection_reason ? (
        <ReviewNote
          status={data.status}
          reason={data.rejection_reason}
          audience="the driver"
        />
      ) : null}

      <FactStrip>
        <Fact icon={Phone} label="Phone" value={data.phone ?? "—"} />
        <Fact icon={MapPin} label="City" value={data.city ?? "—"} />
        <Fact
          icon={Wallet}
          label="Payout"
          value={formatLabel(data.payout_method)}
          sub={payoutSummary(data)}
        />
        <Fact
          icon={FileCheck2}
          label="Documents"
          value={`${data.documents.length} of ${Object.keys(DOCUMENT_LABELS).length}`}
          sub={
            data.documents.length < Object.keys(DOCUMENT_LABELS).length
              ? "Incomplete"
              : "All uploaded"
          }
        />
      </FactStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Documents" count={data.documents.length}>
            {data.documents.length === 0 ? (
              <SectionEmpty>No documents uploaded yet.</SectionEmpty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {data.documents.map((doc) => (
                  <DocumentPreview
                    key={doc.id}
                    applicationId={applicationId}
                    documentId={doc.id}
                    label={DOCUMENT_LABELS[doc.type] ?? doc.type}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Applicant" flush>
            <SectionRows>
              <SectionRow label="Full name" value={data.full_name ?? "—"} />
              <SectionRow
                label="Phone"
                value={
                  data.phone ? (
                    <a
                      href={`tel:${data.phone}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {data.phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <SectionRow label="City" value={data.city ?? "—"} />
              <SectionRow label="National ID number" value={data.national_id_number ?? "—"} />
              <SectionRow label="KRA PIN" value={data.kra_pin ?? "—"} />
            </SectionRows>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          {reviewPanel}

          <SectionCard title="Payout" flush>
            <SectionRows>
              <SectionRow label="Method" value={formatLabel(data.payout_method)} />
              {data.payout_method === "bank" ? (
                <>
                  <SectionRow label="Bank" value={data.payout_bank_name ?? "—"} />
                  <SectionRow label="Account" value={data.payout_bank_account ?? "—"} />
                </>
              ) : (
                <SectionRow label="M-Pesa number" value={data.payout_mpesa_msisdn ?? "—"} />
              )}
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
