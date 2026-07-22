"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

import { GlobalErrorFallback } from "@workspace/ui/components/global-error-fallback"

import "@workspace/ui/globals.css"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <GlobalErrorFallback />
      </body>
    </html>
  )
}
