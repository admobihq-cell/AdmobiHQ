"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import type { DriverProfileDto } from "@workspace/ops-contracts"

import { Stepper as StepIndicator, type StepperStep } from "@workspace/ui/components/stepper"
import { ProfileStep } from "@/components/profile-setup/steps/profile-step"
import { ReviewStep } from "@/components/profile-setup/steps/review-step"
import { TaxPayoutStep } from "@/components/profile-setup/steps/tax-payout-step"

const STEP_LABELS = ["Profile", "Tax & payout", "Review"]

/** Embedded wherever a driver completes their profile — currently a Sheet
 * triggered from Settings, not a standalone route, so it never feels like a
 * separate part of the app. Owns its own step index; the caller only needs
 * to know when submission succeeds (onSubmitted). */
export function ProfileSetupStepper({
  initialProfile,
  onSubmitted,
}: {
  initialProfile: DriverProfileDto
  onSubmitted: (profile: DriverProfileDto) => void
}) {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState(initialProfile)
  const [stepIndex, setStepIndex] = useState(0)

  const steps: StepperStep[] = STEP_LABELS.map((label, index) => ({
    label,
    status: index < stepIndex ? "complete" : index === stepIndex ? "current" : "upcoming",
  }))

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function completeStep(updated: DriverProfileDto) {
    setProfile(updated)
    setStepIndex((i) => Math.min(STEP_LABELS.length - 1, i + 1))
  }

  const completedRequiredSteps = [
    Boolean(
      profile.full_name &&
        profile.phone &&
        profile.city &&
        profile.national_id_number &&
        profile.documents.some((d) => d.type === "national_id") &&
        profile.documents.some((d) => d.type === "profile_photo"),
    ),
    Boolean(profile.kra_pin && profile.payout_method),
  ].filter(Boolean).length
  const progressPercent = Math.round((completedRequiredSteps / 2) * 100)

  return (
    <div className="w-full space-y-8">
      <div className="space-y-3">
        <StepIndicator steps={steps} />
        <p className="text-center text-xs font-medium text-muted-foreground">
          {progressPercent}% complete
          {progressPercent > 0 && progressPercent < 100 ? " — almost there!" : ""}
        </p>
      </div>

      {stepIndex === 0 ? (
        <ProfileStep
          profile={profile}
          getToken={getToken}
          onProfileChange={setProfile}
          onStepComplete={completeStep}
        />
      ) : null}
      {stepIndex === 1 ? (
        <TaxPayoutStep
          profile={profile}
          getToken={getToken}
          onProfileChange={setProfile}
          onStepComplete={completeStep}
          onBack={goBack}
        />
      ) : null}
      {stepIndex === 2 ? (
        <ReviewStep profile={profile} getToken={getToken} onBack={goBack} onSubmitted={onSubmitted} />
      ) : null}
    </div>
  )
}
