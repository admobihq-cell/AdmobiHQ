"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Siren } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/** Routes where the FAB would be wrong or unreachable — the driver is not
 *  signed in yet, or is already in the SOS flow. */
const HIDDEN_PREFIXES = ["/sos", "/auth"]

/**
 * Global SOS button, rendered once in app-shell.tsx so every page under
 * (shell) has it.
 *
 * It ONLY NAVIGATES — it never files an incident. That is what makes an
 * always-present control safe: nothing reaches the ops queue until the driver
 * picks an incident type and submits, so an accidental click costs a
 * dismissed page rather than a false alarm someone has to stand down.
 *
 * A FAB rather than a header button because on a phone browser the thumb
 * reaches the bottom of the screen, not the top.
 */
export function SosFab({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()

  if (!enabled) return null
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <Link
      href="/sos"
      aria-label="Report an emergency"
      title="Report an emergency"
      className={cn(
        "fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full",
        "bg-destructive text-white shadow-lg ring-1 ring-black/5 transition",
        "hover:scale-105 hover:shadow-xl",
        "focus-visible:ring-destructive focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
      )}
    >
      <Siren className="size-6" aria-hidden />
    </Link>
  )
}
