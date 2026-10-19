import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * A titled group of fields in the marketing lead forms. Short fields pair up
 * two-across from `sm`, so a long form reads as a few chunks instead of one
 * tall column; give full-width children (checkbox rows, textareas)
 * `sm:col-span-2`.
 */
export function FormSection({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-x-4 gap-y-4 sm:grid-cols-2 sm:gap-y-5", className)}>
      <legend className="mb-3 text-base font-semibold text-foreground sm:mb-4">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Pitch beside the form from `lg`; the pitch stacks above it on smaller screens. */
export const formPageGrid =
  "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start lg:gap-16"
