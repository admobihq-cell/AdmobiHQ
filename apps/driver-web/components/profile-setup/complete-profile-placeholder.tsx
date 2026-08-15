import Link from "next/link"
import { Clock, ShieldCheck } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

const COPY: Record<string, { title: string; description: string }> = {
  submitted: {
    title: "Your application is under review",
    description:
      "Thanks for submitting your profile. Our team is reviewing your documents — this usually takes a day or two. Check Settings for the latest status.",
  },
  rejected: {
    title: "Your application needs attention",
    description: "Head to Settings to see what needs fixing and resubmit.",
  },
  changes_requested: {
    title: "Changes requested on your application",
    description: "Head to Settings to see what needs fixing and resubmit.",
  },
}

const DEFAULT_COPY = {
  title: "Complete your profile to unlock this",
  description:
    "Verify your identity and payout details so we can activate your driver account.",
}

/** Shown in place of real screen content on every gated route until the
 * driver's profile is approved. Settings is exempt — it's where the
 * stepper/status view lives, so it must always render normally. */
export function CompleteProfilePlaceholder({ status }: { status: string }) {
  const copy = COPY[status] ?? DEFAULT_COPY
  const isReview = status === "submitted"

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          {isReview ? (
            <Clock className="size-6 text-muted-foreground" aria-hidden />
          ) : (
            <ShieldCheck className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        {!isReview ? (
          <Button asChild>
            <Link href="/settings/account">Go to Settings</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
