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
        <GlobalErrorFallback
          title="Ops console error"
          description="Something went wrong loading this page. Try again, or return to the console home."
        />
      </body>
    </html>
  )
}
