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
 * Two-pane auth layout: full-bleed photo + brand statement on the left,
 * form content on the right. Collapses to a single column (form only)
 * below `lg` — the photo panel isn't worth the layout cost on small screens.
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
    <div className={cn("grid min-h-screen lg:grid-cols-2", className)}>
      <div className="relative hidden lg:block">
        <img
          src={photoSrc}
          alt={photoAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/75" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo
            wordmarkClassName="text-lg leading-none text-white"
            className="[&_span.sr-only]:sr-only"
          />
          <div className="max-w-md space-y-2">
            <p className="font-heading text-2xl font-medium text-balance text-white">
              {statement}
            </p>
            {statementDetail ? (
              <p className="text-sm text-white/70">{statementDetail}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className={cn("mx-auto w-full", formClassName)}>
          <div className="mb-10 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
