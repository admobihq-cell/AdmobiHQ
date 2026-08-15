"use client"

import { useEffect, useState } from "react"
import { CookieIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { readCookieConsent, writeCookieConsent } from "@workspace/ui/lib/cookie-consent"

export function CookieConsentBanner({ privacyHref = "/privacy#cookies" }: { privacyHref?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(readCookieConsent() === null)
  }, [])

  if (!visible) return null

  function acceptAll() {
    writeCookieConsent("all")
    // Sentry/GA init already ran (and skipped, since no consent existed yet)
    // by the time this click happens — reloading is the simplest way to let
    // them actually start without duplicating each app's init call here.
    window.location.reload()
  }

  function essentialOnly() {
    writeCookieConsent("essential")
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 ease-out animate-in fade-in-0 slide-in-from-bottom-4 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:w-full sm:max-w-sm"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xl shadow-foreground/5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CookieIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="space-y-1 pt-0.5">
            <p className="text-sm font-semibold text-foreground">We use cookies</p>
            <p className="text-sm text-muted-foreground">
              For error tracking and understanding site traffic. Choose what you&apos;re
              comfortable with, or{" "}
              <a href={privacyHref} className="underline underline-offset-2 hover:text-foreground">
                read our policy
              </a>
              .
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={essentialOnly}>
            Essential only
          </Button>
          <Button type="button" size="sm" onClick={acceptAll}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  )
}
