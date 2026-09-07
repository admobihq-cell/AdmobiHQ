import Link from "next/link"
import { X } from "lucide-react"

import { Logo } from "@workspace/ui/brand/logo"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Full-screen chrome for the campaign wizard: the same sticky logo bar and
 * centred column driver-web uses for profile setup, so the two flows feel like
 * one product. Enter motion matches the driver Sheet (`slide-in-from-right`).
 *
 * Lives outside `new-campaign-screen.tsx` so `new/loading.tsx` can render the
 * identical shell — without it the route falls back to the campaigns *list*
 * skeleton, inside the app shell, and then jumps to this overlay. */
export function NewCampaignChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background duration-200 ease-out animate-in fade-in-0 slide-in-from-right-10 motion-reduce:animate-none">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-8">
        <Logo markHeight={18} wordmarkClassName="text-sm font-semibold leading-none" />
        <Button variant="ghost" size="icon-sm" asChild aria-label="Close">
          <Link href="/campaigns">
            <X aria-hidden />
          </Link>
        </Button>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
    </div>
  )
}

/** Matches the wizard's first step — 4-dot stepper, progress line, then a
 * label+input form. Used both by the route's `loading.tsx` and while an
 * existing draft is being fetched, so nothing shifts between the two. */
export function NewCampaignSkeleton() {
  return (
    <NewCampaignChrome>
      <div className="w-full space-y-8">
        <div className="space-y-3">
          <div className="flex w-full items-center">
            {[0, 1, 2, 3].map((step) => (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="hidden h-3 w-12 sm:block" />
                </div>
                {step < 3 ? <div className="mx-2 h-px flex-1 bg-border" aria-hidden /> : null}
              </div>
            ))}
          </div>
          <Skeleton className="mx-auto h-3 w-28" />
          <Skeleton className="mx-auto h-3 w-56" />
        </div>

        <div className="space-y-6">
          {[0, 1, 2].map((field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-9 w-full rounded-lg sm:flex-1" />
            <Skeleton className="h-9 w-full rounded-lg sm:w-32" />
          </div>
        </div>
      </div>
    </NewCampaignChrome>
  )
}
