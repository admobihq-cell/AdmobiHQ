import Link from "next/link"
import { X } from "lucide-react"

import { Logo } from "@workspace/ui/brand/logo"
import { Button } from "@workspace/ui/components/button"

import { FlowScrollLock } from "@/components/flow-scroll-lock"

/** Full-screen chrome for a focused create flow: sticky logo bar, a close
 * affordance back to where the flow was entered from, and a centred column.
 * Shared so the campaign wizard and the support request read as one product.
 *
 * Keep this out of the screen component that uses it — a route's
 * `loading.tsx` has to render the identical shell, otherwise the page falls
 * back to the parent list skeleton inside the app shell and then snaps into
 * this overlay.
 *
 * The backdrop is opaque from the first frame and never animates; only the
 * panel inside it slides in. A route's `loading.tsx` and its page are two
 * separate mounts, so animating the backdrop replayed the slide and let the
 * app shell show through the fade — which read as the overlay rendering twice.
 */
export function FlowChrome({
  closeHref,
  closeLabel = "Close",
  children,
}: {
  closeHref: string
  closeLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <FlowScrollLock />
      <div className="duration-200 ease-out animate-in fade-in-0 slide-in-from-right-6 motion-reduce:animate-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-8">
          <Logo markHeight={18} wordmarkClassName="text-sm font-semibold leading-none" />
          <Button variant="ghost" size="icon-sm" asChild aria-label={closeLabel}>
            <Link href={closeHref}>
              <X aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
      </div>
    </div>
  )
}
