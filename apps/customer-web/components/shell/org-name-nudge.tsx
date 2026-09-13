"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth, useUser } from "@clerk/nextjs"

import type { AdvertiserOrgDto } from "@workspace/ops-contracts"
import { Button } from "@workspace/ui/components/button"
import { Popover, PopoverAnchor, PopoverContent } from "@workspace/ui/components/popover"

import {
  readOrgNameNudgeDismissed,
  writeOrgNameNudgeDismissed,
} from "@/lib/org-name-nudge-storage"

/** Give the page a beat to settle (and not compete with the tour's opening
 * step) before nudging — this is non-blocking, so there's nothing to wait
 * on, just a fixed delay so it doesn't pop in the instant the shell mounts. */
const OPEN_DELAY_MS = 1500

function defaultOrgName(firstName: string | null | undefined): string {
  return firstName ? `${firstName}'s Organization` : "My Organization"
}

/**
 * Wraps the sidebar header's org-name pill. Auto-opens once, only for a solo
 * account (memberCount === 1) still carrying the bootstrap-assigned default
 * name — never for a name the user actually chose. Dismissing just stops the
 * nudge; it never renames anything.
 */
export function OrgNameNudge({
  org,
  children,
}: {
  org: AdvertiserOrgDto | null
  children: React.ReactNode
}) {
  const { user } = useUser()
  const { userId } = useAuth()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (userId) setDismissed(readOrgNameNudgeDismissed(userId))
  }, [userId])

  const isDefaultName = org != null && org.name === defaultOrgName(user?.firstName)
  const eligible = isDefaultName && org?.memberCount === 1 && !dismissed

  useEffect(() => {
    if (!eligible) return
    const timer = setTimeout(() => setOpen(true), OPEN_DELAY_MS)
    return () => clearTimeout(timer)
  }, [eligible])

  function dismiss() {
    setOpen(false)
    setDismissed(true)
    if (userId) writeOrgNameNudgeDismissed(userId)
  }

  if (!eligible) return <>{children}</>

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent side="bottom" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Make this workspace yours</p>
          <p className="text-xs text-muted-foreground">
            We named it &quot;{org?.name}&quot; to get you started — rename it any time.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
              Dismiss
            </Button>
            <Button type="button" size="sm" asChild onClick={dismiss}>
              <Link href="/settings/team">Rename</Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
