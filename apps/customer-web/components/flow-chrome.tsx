import Link from "next/link"
import { X } from "lucide-react"

import { Logo } from "@workspace/ui/brand/logo"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

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
 * `animateIn` belongs to whichever node mounts *first* (in practice the
 * route's loading skeleton). The page that replaces it is a separate mount, so
 * animating both replays the slide and briefly shows the app shell through the
 * `fade-in-0` — which reads as the overlay rendering twice.
 */
export function FlowChrome({
  closeHref,
  closeLabel = "Close",
  animateIn = false,
  children,
}: {
  closeHref: string
  closeLabel?: string
  animateIn?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 overflow-y-auto bg-background",
        animateIn &&
          "duration-200 ease-out animate-in fade-in-0 slide-in-from-right-10 motion-reduce:animate-none",
      )}
    >
      <FlowScrollLock />
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
  )
}
