"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { AlertCircle, CheckCircle2, ChevronDown, Clock, ShieldQuestion, X } from "lucide-react"
import type { DriverProfileDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Logo } from "@workspace/ui/brand/logo"
import { cn } from "@workspace/ui/lib/utils"

import { ProfileSetupStepper } from "@/components/profile-setup/stepper"
import { DriverVerificationSectionSkeleton } from "@/components/skeletons/driver-verification-section-skeleton"
import { SubmittedInfoView } from "@/components/settings/submitted-info-view"
import { fetchDriverProfileClient } from "@/lib/driver-profile-client"

const STATUS_COPY: Record<
  string,
  { label: string; description: string; icon: typeof CheckCircle2; iconClassName: string }
> = {
  approved: {
    label: "Verified",
    description: "Your account is verified — you have full access to the app.",
    icon: CheckCircle2,
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  submitted: {
    label: "Under review",
    description: "We're reviewing your documents — this usually takes a day or two.",
    icon: Clock,
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  rejected: {
    label: "Action needed",
    description: "Your application needs changes before it can be approved.",
    icon: AlertCircle,
    iconClassName: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  changes_requested: {
    label: "Action needed",
    description: "We requested some changes before your application can be approved.",
    icon: AlertCircle,
    iconClassName: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  draft: {
    label: "Incomplete",
    description: "Complete your profile so we can verify your account.",
    icon: ShieldQuestion,
    iconClassName: "bg-muted text-muted-foreground",
  },
}

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

export function DriverVerificationSection() {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<DriverProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepperOpen, setStepperOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchDriverProfileClient(getToken)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !profile) {
    return <DriverVerificationSectionSkeleton />
  }

  const copy = STATUS_COPY[profile.status] ?? STATUS_COPY.draft!
  const Icon = copy.icon
  const canEdit = EDITABLE_STATUSES.has(profile.status)
  const hasSubmittedInfo = Boolean(profile.full_name || profile.documents.length > 0)

  return (
    <div className="space-y-3">
      <Card className="shadow-none">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  copy.iconClassName,
                )}
              >
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="space-y-1 pt-0.5">
                <p className="text-base font-semibold leading-none">{copy.label}</p>
                <p className="text-sm text-muted-foreground">{copy.description}</p>
              </div>
            </div>
            {canEdit ? (
              <Button type="button" size="sm" className="shrink-0" onClick={() => setStepperOpen(true)}>
                {profile.status === "draft" ? "Complete your profile" : "Continue application"}
              </Button>
            ) : null}
          </div>

          {profile.rejection_reason &&
          (profile.status === "rejected" || profile.status === "changes_requested") ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">
                {profile.status === "rejected" ? "Why it was rejected" : "What needs to change"}
              </p>
              <p className="mt-1">{profile.rejection_reason}</p>
            </div>
          ) : null}

          {hasSubmittedInfo ? (
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-foreground"
              >
                View your submitted information
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform", showInfo && "rotate-180")}
                  aria-hidden
                />
              </button>
              {showInfo ? (
                <div className="mt-4">
                  <SubmittedInfoView profile={profile} getToken={getToken} />
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={stepperOpen} onOpenChange={setStepperOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-4 py-3 sm:px-8">
            <Logo markHeight={18} wordmarkClassName="text-sm font-semibold leading-none" />
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                <X aria-hidden />
              </Button>
            </SheetClose>
          </div>

          <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
            <SheetHeader className="sr-only">
              <SheetTitle>Complete your profile</SheetTitle>
            </SheetHeader>
            <ProfileSetupStepper
              initialProfile={profile}
              onSubmitted={(updated) => {
                setProfile(updated)
                setStepperOpen(false)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
