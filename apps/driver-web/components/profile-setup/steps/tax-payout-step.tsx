"use client"

import { useState } from "react"
import type { DriverPayoutMethod, DriverProfileDto } from "@workspace/ops-contracts"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { patchDriverProfile } from "@/lib/driver-profile-client"
import { DocumentUploadField } from "@/components/profile-setup/document-upload-field"
import { StepShell } from "@/components/profile-setup/steps/step-shell"
import type { GetToken } from "@/lib/driver-profile-client"

export function TaxPayoutStep({
  profile,
  getToken,
  onProfileChange,
  onStepComplete,
  onBack,
}: {
  profile: DriverProfileDto
  getToken: GetToken
  onProfileChange: (profile: DriverProfileDto) => void
  onStepComplete: (profile: DriverProfileDto) => void
  onBack: () => void
}) {
  const [kraPin, setKraPin] = useState(profile.kra_pin ?? "")
  const [method, setMethod] = useState<DriverPayoutMethod | "">(
    (profile.payout_method as DriverPayoutMethod | null) ?? "",
  )
  const [mpesaMsisdn, setMpesaMsisdn] = useState(profile.payout_mpesa_msisdn ?? "")
  const [bankName, setBankName] = useState(profile.payout_bank_name ?? "")
  const [bankAccount, setBankAccount] = useState(profile.payout_bank_account ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const certificateDoc = profile.documents.find((d) => d.type === "kra_pin_certificate")

  const canContinue =
    kraPin.trim() &&
    (method === "mpesa"
      ? mpesaMsisdn.trim().length > 0
      : method === "bank"
        ? bankName.trim().length > 0 && bankAccount.trim().length > 0
        : false)

  async function handleNext() {
    if (!method) return
    setError(null)
    setSaving(true)
    try {
      const updated = await patchDriverProfile(getToken, {
        kra_pin: kraPin.trim(),
        payout_method: method,
        ...(method === "mpesa"
          ? { payout_mpesa_msisdn: mpesaMsisdn.trim() }
          : { payout_bank_name: bankName.trim(), payout_bank_account: bankAccount.trim() }),
      })
      onStepComplete(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <StepShell
      title="Tax & payout"
      description="Needed for tax compliance and to know where to send your earnings."
      onBack={onBack}
      onNext={handleNext}
      nextDisabled={!canContinue}
      nextLoading={saving}
      error={error}
    >
      <div className="space-y-1.5">
        <Label htmlFor="kra_pin">KRA PIN</Label>
        <Input
          id="kra_pin"
          value={kraPin}
          onChange={(e) => setKraPin(e.target.value)}
          placeholder="A012345678B"
        />
      </div>

      <DocumentUploadField
        type="kra_pin_certificate"
        label="KRA PIN certificate (optional)"
        hint="A photo of your KRA PIN certificate speeds up review, but isn't required."
        document={certificateDoc}
        onUploaded={(doc) => {
          onProfileChange({
            ...profile,
            documents: [
              ...profile.documents.filter((d) => d.type !== "kra_pin_certificate"),
              doc,
            ],
          })
        }}
      />

      <div className="space-y-1.5">
        <Label htmlFor="payout_method">Payout method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as DriverPayoutMethod)}>
          <SelectTrigger id="payout_method" className="w-full">
            <SelectValue placeholder="Choose a payout method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mpesa">M-Pesa</SelectItem>
            <SelectItem value="bank">Bank transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {method === "mpesa" ? (
        <div className="space-y-1.5">
          <Label htmlFor="mpesa_msisdn">M-Pesa number</Label>
          <Input
            id="mpesa_msisdn"
            value={mpesaMsisdn}
            onChange={(e) => setMpesaMsisdn(e.target.value)}
            placeholder="07XXXXXXXX"
          />
        </div>
      ) : null}

      {method === "bank" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bank_name">Bank name</Label>
            <Input id="bank_name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_account">Account number</Label>
            <Input
              id="bank_account"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </StepShell>
  )
}
