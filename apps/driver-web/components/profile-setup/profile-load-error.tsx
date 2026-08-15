"use client"

import { RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

/** Shown only when fetchDriverProfile() itself fails (network/API error) —
 * distinct from CompleteProfilePlaceholder, which handles the normal
 * "profile exists but isn't approved yet" states. Keep this copy about
 * connectivity, never "verify," so it doesn't read as part of the
 * verification-status flow. */
export function ProfileLoadError() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load your account</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;re having trouble reaching our servers. Your verification status hasn&apos;t
            changed — this is just a connection issue.
          </p>
        </div>
        <Button type="button" onClick={() => window.location.reload()}>
          <RefreshCw data-icon="inline-start" />
          Try again
        </Button>
      </div>
    </div>
  )
}
