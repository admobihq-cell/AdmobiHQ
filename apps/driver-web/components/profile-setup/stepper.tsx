"use client"

import { useState } from "react"
import type { DriverProfileDto } from "@workspace/ops-contracts"

import { Stepper as StepIndicator, type StepperStep } from "@workspace/ui/components/stepper"
import { ProfileStep } from "@/components/profile-setup/steps/profile-step"
import { ReviewStep } from "@/components/profile-setup/steps/review-step"
import { TaxPayoutStep } from "@/components/profile-setup/steps/tax-payout-step"
import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"

const STEP_LABELS = ["Profile", "Tax & payout", "Review"]

/** Whether each required step's fields are already on file — a driver who
 * created their account earlier, or is resuming after "changes requested",
 * can walk in with step 0 (or both) already complete. */
function stepCompletion(profile: DriverProfileDto): [boolean, boolean] {
  return [
    Boolean(
      profile.full_name &&
        profile.phone &&
        profile.city &&
        profile.national_id_number &&
        profile.documents.some((d) => d.type === "national_id") &&
        profile.documents.some((d) => d.type === "profile_photo"),
    ),
    Boolean(profile.kra_pin && profile.payout_method),
  ]
}

/** Index of the first incomplete step, so a driver who already has data on
 * file resumes where they left off instead of restarting at 0%. */
function firstIncompleteStepIndex(profile: DriverProfileDto): number {
  const [step0Done, step1Done] = stepCompletion(profile)
  if (!step0Done) return 0
  if (!step1Done) return 1
  return 2
}

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
  const { getToken } = useAuthIfEnabled()
  const [profile, setProfile] = useState(initialProfile)
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteStepIndex(initialProfile))

  const [step0Done, step1Done] = stepCompletion(profile)
  const stepDone = [step0Done, step1Done]

  const steps: StepperStep[] = STEP_LABELS.map((label, index) => ({
    label,
    status:
      index === stepIndex
        ? "current"
        : (index < 2 && stepDone[index]) || index < stepIndex
          ? "complete"
          : "upcoming",
  }))

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function completeStep(updated: DriverProfileDto) {
    setProfile(updated)
    setStepIndex((i) => Math.min(STEP_LABELS.length - 1, i + 1))
  }

  const completedRequiredSteps = stepDone.filter(Boolean).length
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
