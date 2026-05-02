"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

export function MobileStickyCta() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto border-t border-border bg-background px-4 py-3 shadow-[0_-8px_24px_-8px_oklch(0.2_0.02_262/0.12)]">
        <div className="mx-auto flex max-w-[min(100%,36rem)] gap-2">
          <Button asChild className="min-h-11 flex-1" variant="outline" size="lg">
            <Link href="/partner-fleet">Fleet</Link>
          </Button>
          <Button asChild className="min-h-11 flex-1" size="lg">
            <Link href="/start-campaign">Start a campaign</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
