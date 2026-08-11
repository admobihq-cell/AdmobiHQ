import type { ReactNode } from "react"

import { Logo } from "@workspace/ui/brand/logo"
import { cn } from "@workspace/ui/lib/utils"

type AuthSplitShellProps = {
  /** Full-bleed brand photo for the left panel (hidden below `lg`). */
  photoSrc: string
  photoAlt: string
  /** Short brand statement anchored over the photo, e.g. "Screens that move with the city." */
  statement: string
  /** Optional supporting line under the statement. */
  statementDetail?: string
  /** The form pane content (heading, fields, actions, legal line). */
  children: ReactNode
  className?: string
  /** Width cap on the form column. Defaults to `max-w-sm`. */
  formClassName?: string
}

/**
 * Two-pane auth layout, framed as a pair of rounded panels inset from the
 * viewport edge rather than bleeding to it: full-bleed photo with the brand
 * statement on the left, brand-toned form panel on the right. Collapses to a
 * single, unframed form column below `lg` — the photo and the inset frame
 * aren't worth the layout cost on small screens.
 */
export function AuthSplitShell({
  photoSrc,
  photoAlt,
  statement,
  statementDetail,
  children,
  className,
  formClassName = "max-w-sm",
}: AuthSplitShellProps) {
  return (
    <div className={cn("min-h-screen bg-background lg:bg-muted lg:p-5 xl:p-6", className)}>
      <div className="mx-auto grid min-h-screen w-full lg:min-h-[calc(100vh-2.5rem)] lg:max-w-[1480px] lg:grid-cols-2 lg:gap-4 xl:min-h-[calc(100vh-3rem)]">
        <div className="relative hidden overflow-hidden lg:block lg:rounded-4xl">
          <img
            src={photoSrc}
            alt={photoAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />
          <div className="relative flex h-full flex-col justify-end p-10 xl:p-12">
            <div className="max-w-md space-y-3">
              <p className="font-heading text-3xl font-medium text-balance text-white xl:text-4xl">
                {statement}
              </p>
              {statementDetail ? (
                <p className="text-sm text-white/70">{statementDetail}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-background px-6 py-10 sm:px-10 sm:py-12 lg:rounded-4xl lg:bg-gradient-to-br lg:from-background lg:to-accent/60 lg:px-12 lg:py-14">
          <Logo />
          <div className="flex flex-1 items-center py-10 lg:py-0">
            <div className={cn("mx-auto w-full", formClassName)}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
