import { Skeleton } from "@workspace/ui/components/skeleton"

import { FlowChrome } from "@/components/flow-chrome"

/** Same overlay the campaign wizard uses — raising a support request is the
 * other thing someone comes here to actually *do*, so it gets the whole screen
 * rather than a side sheet that loses a half-written message on reload. */
export function NewRequestChrome({
  animateIn,
  children,
}: {
  animateIn?: boolean
  children: React.ReactNode
}) {
  return (
    <FlowChrome
      closeHref="/settings/support"
      closeLabel="Close and go back to help & contact"
      animateIn={animateIn}
    >
      {children}
    </FlowChrome>
  )
}

/** The route's `loading.tsx` — the first thing to mount, so it owns the enter
 * animation; the page that replaces it must not replay it. */
export function NewRequestSkeleton() {
  return (
    <NewRequestChrome animateIn>
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[0, 1, 2, 3, 4].map((chip) => (
                <Skeleton key={chip} className="h-[70px] w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>

          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
    </NewRequestChrome>
  )
}
