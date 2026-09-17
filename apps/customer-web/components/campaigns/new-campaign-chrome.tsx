import { Skeleton } from "@workspace/ui/components/skeleton"

import { FlowChrome } from "@/components/flow-chrome"

/** Enter motion and centred column come from the shared flow chrome; this just
 * pins the close affordance to the campaigns list. */
export function NewCampaignChrome({
  animateIn,
  children,
}: {
  animateIn?: boolean
  children: React.ReactNode
}) {
  return (
    <FlowChrome closeHref="/campaigns" animateIn={animateIn}>
      {children}
    </FlowChrome>
  )
}

/** Matches the wizard's first step — 4-dot stepper, progress line, then a
 * label+input form. Bodiless so the screen can drop it into a chrome that's
 * already mounted while an existing draft loads, instead of swapping in a
 * second overlay that replays the enter animation. */
export function NewCampaignSkeletonBody() {
  return (
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
  )
}

/** The route's `loading.tsx` — the first thing to mount, so it owns the enter
 * animation. */
export function NewCampaignSkeleton() {
  return (
    <NewCampaignChrome animateIn>
      <NewCampaignSkeletonBody />
    </NewCampaignChrome>
  )
}
