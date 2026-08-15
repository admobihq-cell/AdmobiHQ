"use client"

import { useState } from "react"
import type { DriverProfileDto } from "@workspace/ops-contracts"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { patchDriverProfile } from "@/lib/driver-profile-client"
import { DocumentUploadField } from "@/components/profile-setup/document-upload-field"
import { StepShell } from "@/components/profile-setup/steps/step-shell"
import type { GetToken } from "@/lib/driver-profile-client"

export function ProfileStep({
  profile,
  getToken,
  onProfileChange,
  onStepComplete,
}: {
  profile: DriverProfileDto
  getToken: GetToken
  /** Updates local profile state only — does not advance the stepper. */
  onProfileChange: (profile: DriverProfileDto) => void
  /** Updates local profile state and advances to the next step. */
  onStepComplete: (profile: DriverProfileDto) => void
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "")
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [city, setCity] = useState(profile.city ?? "")
  const [nationalId, setNationalId] = useState(profile.national_id_number ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nationalIdDoc = profile.documents.find((d) => d.type === "national_id")
  const photoDoc = profile.documents.find((d) => d.type === "profile_photo")

  const canContinue =
    fullName.trim() && phone.trim() && city.trim() && nationalId.trim() && nationalIdDoc && photoDoc

  async function handleNext() {
    setError(null)
    setSaving(true)
    try {
      const updated = await patchDriverProfile(getToken, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        national_id_number: nationalId.trim(),
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
      title="Your profile"
      description="Tell us who you are and verify your identity."
      onNext={handleNext}
      nextDisabled={!canContinue}
      nextLoading={saving}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="national_id_number">National ID number</Label>
          <Input
            id="national_id_number"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
          />
        </div>
      </div>

      <DocumentUploadField
        type="national_id"
        label="National ID (front)"
        hint="A clear photo of your National ID card."
        document={nationalIdDoc}
        onUploaded={(doc) => {
          onProfileChange({
            ...profile,
            documents: [...profile.documents.filter((d) => d.type !== "national_id"), doc],
          })
        }}
      />

      <DocumentUploadField
        type="profile_photo"
        label="Profile photo"
        hint="Face clearly visible, no sunglasses or hats."
        document={photoDoc}
        onUploaded={(doc) => {
          onProfileChange({
            ...profile,
            documents: [...profile.documents.filter((d) => d.type !== "profile_photo"), doc],
          })
        }}
      />
    </StepShell>
  )
}
