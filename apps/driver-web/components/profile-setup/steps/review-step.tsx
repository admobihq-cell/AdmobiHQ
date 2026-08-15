"use client"

import { useState } from "react"
import type { DriverProfileDto } from "@workspace/ops-contracts"

import { submitDriverProfile } from "@/lib/driver-profile-client"
import { StepShell } from "@/components/profile-setup/steps/step-shell"
import type { GetToken } from "@/lib/driver-profile-client"

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  profile_photo: "Profile photo",
  kra_pin_certificate: "KRA PIN certificate",
  payout_proof: "Payout proof",
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ReviewStep({
  profile,
  getToken,
  onSubmitted,
  onBack,
}: {
  profile: DriverProfileDto
  getToken: GetToken
  onSubmitted: (profile: DriverProfileDto) => void
  onBack: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const updated = await submitDriverProfile(getToken)
      onSubmitted(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StepShell
      title="Review & submit"
      description="Double-check everything before sending it to our team for review."
      onBack={onBack}
      onNext={handleSubmit}
      nextLabel="Submit for review"
      nextLoading={submitting}
      error={error}
    >
      <div className="rounded-lg border border-border p-4">
        <SummaryRow label="Full name" value={profile.full_name ?? "—"} />
        <SummaryRow label="Phone" value={profile.phone ?? "—"} />
        <SummaryRow label="City" value={profile.city ?? "—"} />
        <SummaryRow label="National ID" value={profile.national_id_number ?? "—"} />
        <SummaryRow label="KRA PIN" value={profile.kra_pin ?? "—"} />
        <SummaryRow
          label="Payout"
          value={
            profile.payout_method === "mpesa"
              ? `M-Pesa · ${profile.payout_mpesa_msisdn ?? "—"}`
              : profile.payout_method === "bank"
                ? `${profile.payout_bank_name ?? "—"} · ${profile.payout_bank_account ?? "—"}`
                : "—"
          }
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Documents</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {profile.documents.map((doc) => (
            <li key={doc.id}>{DOCUMENT_LABELS[doc.type] ?? doc.type}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        By submitting, you confirm the information above is accurate. See our{" "}
        <a href="/terms" target="_blank" rel="noreferrer" className="underline">
          terms
        </a>{" "}
        for what happens if a document turns out to be false or fraudulent.
      </p>
    </StepShell>
  )
}
