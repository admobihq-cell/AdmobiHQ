"use client"

import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { DriverDocumentDto, DriverProfileDto } from "@workspace/ops-contracts"

import { ImageLightbox } from "@workspace/ui/components/image-lightbox"

import { fetchDriverDocumentBlob, type GetToken } from "@/lib/driver-profile-client"

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  profile_photo: "Profile photo",
  kra_pin_certificate: "KRA PIN certificate",
  payout_proof: "Payout proof",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function DocumentThumb({ doc, getToken }: { doc: DriverDocumentDto; getToken: GetToken }) {
  const previewQuery = useQuery({
    queryKey: ["driver-document-blob", doc.id],
    queryFn: () => fetchDriverDocumentBlob(getToken, doc.id),
  })
  const previewBlob = previewQuery.data ?? null
  const failed = previewQuery.isError

  useEffect(() => {
    if (previewQuery.isError) {
      console.error(
        "[SubmittedInfoView] failed to load document preview:",
        previewQuery.error,
      )
    }
  }, [previewQuery.isError, previewQuery.error])

  // The Blob is cached (shared with document-upload-field.tsx's preview for
  // the same document id); the object URL derived from it is not — it's
  // revoked on unmount/change, so caching the URL string itself would let a
  // revoked URL leak into another mounted consumer of the same cache entry.
  const url = useMemo(() => (previewBlob ? URL.createObjectURL(previewBlob) : null), [previewBlob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const label = DOCUMENT_LABELS[doc.type] ?? doc.type

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {url ? (
        <ImageLightbox src={url} alt={label}>
          <img
            src={url}
            alt={label}
            className="h-36 w-full rounded-lg border border-border object-cover"
          />
        </ImageLightbox>
      ) : failed ? (
        <button
          type="button"
          onClick={() => void previewQuery.refetch()}
          className="flex h-36 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
        >
          <span>Couldn&apos;t load preview</span>
          <span className="font-medium text-foreground">Tap to retry</span>
        </button>
      ) : (
        <div className="h-36 w-full animate-pulse rounded-lg bg-muted" />
      )}
    </div>
  )
}

/** Read-only view of what a driver has submitted — shown in Settings
 * regardless of review status, so a driver can always see and track their
 * own information, not just while the stepper is gating them. */
export function SubmittedInfoView({
  profile,
  getToken,
}: {
  profile: DriverProfileDto
  getToken: GetToken
}) {
  return (
    <div className="space-y-6">
      <Section title="Personal information">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-2">
          <Field label="Full name" value={profile.full_name ?? "—"} />
          <Field label="Phone" value={profile.phone ?? "—"} />
          <Field label="City" value={profile.city ?? "—"} />
          <Field label="National ID" value={profile.national_id_number ?? "—"} />
          <Field label="KRA PIN" value={profile.kra_pin ?? "—"} />
        </div>
      </Section>

      <Section title="Payout details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-2">
          <Field
            label="Method"
            value={
              profile.payout_method === "mpesa"
                ? "M-Pesa"
                : profile.payout_method === "bank"
                  ? "Bank transfer"
                  : "—"
            }
          />
          {profile.payout_method === "mpesa" ? (
            <Field label="M-Pesa number" value={profile.payout_mpesa_msisdn ?? "—"} />
          ) : profile.payout_method === "bank" ? (
            <>
              <Field label="Bank" value={profile.payout_bank_name ?? "—"} />
              <Field label="Account number" value={profile.payout_bank_account ?? "—"} />
            </>
          ) : null}
        </div>
      </Section>

      {profile.documents.length > 0 ? (
        <Section title="Documents">
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.documents.map((doc) => (
              <DocumentThumb key={doc.id} doc={doc} getToken={getToken} />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  )
}
