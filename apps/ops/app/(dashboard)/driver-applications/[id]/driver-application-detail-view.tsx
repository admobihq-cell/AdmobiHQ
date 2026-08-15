"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { DriverProfileDto } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
import { ImageLightbox } from "@workspace/ui/components/image-lightbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { StatusBadge } from "@/components/status-badge"
import { DriverApplicationDetailSkeleton } from "@/components/driver-application-detail-skeleton"
import { formatDateTime, formatLabel } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  profile_photo: "Profile photo",
  kra_pin_certificate: "KRA PIN certificate",
  payout_proof: "Payout proof",
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
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

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/driver-applications">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{data.full_name ?? "Driver application"}</h1>
          <p className="text-sm text-muted-foreground">Submitted {formatDateTime(data.submitted_at)}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {data.rejection_reason ? (
        <div className="max-w-2xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Last review note</p>
          <p className="mt-1">{data.rejection_reason}</p>
        </div>
      ) : null}

      <div className="max-w-2xl rounded-xl border bg-card p-4 shadow-none">
        <DetailRow label="Full name" value={data.full_name ?? "—"} />
        <DetailRow label="Phone" value={data.phone ?? "—"} />
        <DetailRow label="City" value={data.city ?? "—"} />
        <DetailRow label="National ID number" value={data.national_id_number ?? "—"} />
        <DetailRow label="KRA PIN" value={data.kra_pin ?? "—"} />
        <DetailRow
          label="Payout"
          value={
            data.payout_method === "mpesa"
              ? `M-Pesa · ${data.payout_mpesa_msisdn ?? "—"}`
              : data.payout_method === "bank"
                ? `${data.payout_bank_name ?? "—"} · ${data.payout_bank_account ?? "—"}`
                : formatLabel(data.payout_method)
          }
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Documents</p>
        {data.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {canReview || canUnapprove ? (
        <div className="max-w-2xl space-y-3 rounded-xl border bg-card p-4 shadow-none">
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
                rows={3}
              />
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
                onClick={() => void review("approved", "Application approved")}
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
