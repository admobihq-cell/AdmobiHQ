"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

import { Button } from "@workspace/ui/components/button"
import { Popover, PopoverAnchor, PopoverContent } from "@workspace/ui/components/popover"
import { useTourReplay } from "@workspace/ui/components/tour-provider"

import {
  readProfileNudgeDismissed,
  writeProfileNudgeDismissed,
} from "@/lib/profile-nudge-storage"

/** Same beat as the org-name nudge: long enough that the shell has settled. */
const OPEN_DELAY_MS = 1500

function missingFields(user: {
  firstName: string | null
  lastName: string | null
  username: string | null
}): string[] {
  return [
    user.firstName ? null : "first name",
    user.lastName ? null : "last name",
    user.username ? null : "username",
  ].filter((field): field is string => field !== null)
}

function listPhrase(fields: string[]): string {
  if (fields.length <= 1) return fields[0] ?? ""
  return `${fields.slice(0, -1).join(", ")} and ${fields[fields.length - 1]}`
}

/**
 * Wraps the sidebar footer's user pill. Email-code sign-up only ever collects
 * an email, so most new accounts land with no name at all — this points at
 * Settings → Account once, then stays quiet. Non-blocking by design: nothing
 * here gates the product, so it must never behave like the old modal prompt.
 */
export function ProfileNameNudge({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser()
  const { isOpen: tourOpen } = useTourReplay()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  const userId = user?.id ?? null

  useEffect(() => {
    if (userId) setDismissed(readProfileNudgeDismissed(userId))
  }, [userId])

  const missing = isLoaded && user ? missingFields(user) : []
  const eligible = missing.length > 0 && !dismissed

  useEffect(() => {
    // The tour anchors on this same sidebar, so don't even start counting
    // while it's running — two cards over one corner is nobody's onboarding.
    if (!eligible || tourOpen) return
    const timer = setTimeout(() => setOpen(true), OPEN_DELAY_MS)
    return () => clearTimeout(timer)
  }, [eligible, tourOpen])

  function dismiss() {
    setOpen(false)
    setDismissed(true)
    if (userId) writeProfileNudgeDismissed(userId)
  }

  if (!eligible) return <>{children}</>

  return (
    // Hiding on `tourOpen` rather than closing keeps a replayed tour from
    // burning the one-time dismissal.
    <Popover open={open && !tourOpen} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverContent side="right" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Finish setting up your profile</p>
          <p className="text-xs text-muted-foreground">
            You signed up with just an email. Add your {listPhrase(missing)} so teammates and
            Admobi know who they&apos;re working with.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
              Not now
            </Button>
            <Button type="button" size="sm" asChild onClick={dismiss}>
              <Link href="/settings/account">Add details</Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
