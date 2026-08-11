"use client"

import { useEffect } from "react"

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[MarketingError] Render error:", error)
    reset()
  }, [error, reset])

  return (
    <html lang="en">
      <body className="bg-background min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mb-6">
            We&apos;re having trouble loading the page. Please try refreshing.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}