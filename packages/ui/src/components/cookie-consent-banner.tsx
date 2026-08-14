"use client"

import { useEffect, useState } from "react"

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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card p-4 shadow-lg sm:p-5">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies for error tracking and to understand site traffic. Choose what you're
          comfortable with —{" "}
          <a href={privacyHref} className="underline underline-offset-2 hover:text-foreground">
            read more
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
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
