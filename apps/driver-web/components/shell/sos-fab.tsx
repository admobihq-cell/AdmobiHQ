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
 * Deliberately NOT behind a platform flag: the route to reporting an accident
 * must not depend on a toggle someone can forget to turn on, or that gets
 * switched off during an unrelated incident.
 *
 * It ONLY NAVIGATES — it never files an incident. That is what makes an
 * always-present control safe: nothing reaches the ops queue until the driver
 * picks an incident type and submits, so an accidental click costs a
 * dismissed page rather than a false alarm someone has to stand down.
 *
 * A FAB rather than a header button because on a phone browser the thumb
 * reaches the bottom of the screen, not the top.
 */
export function SosFab() {
  const pathname = usePathname()

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <Link
      href="/sos"
      aria-label="Report an emergency"
      title="Report an emergency"
      className={cn(
        // Above the phone tab bar (h-16 + safe area); bottom-right corner from md.
        "fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex size-14 items-center justify-center rounded-full md:right-6 md:bottom-6",
        "bg-destructive text-white shadow-lg ring-1 ring-black/5",
        "transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96]",
        // Hover lift only with a real pointer: on touch, hover fires on tap and the button jumps mid-press.
        "[@media(hover:hover)_and_(pointer:fine)]:hover:scale-105 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-xl",
        "focus-visible:ring-destructive focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:hover:scale-100",
      )}
    >
      <Siren className="size-6" aria-hidden />
    </Link>
  )
}
