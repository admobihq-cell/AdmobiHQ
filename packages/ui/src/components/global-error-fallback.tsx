"use client"

import { RefreshCw } from "lucide-react"

import { RouteSignalMark } from "@workspace/ui/brand/admobi-mark"
import { BRAND_TERRA } from "@workspace/ui/brand/constants"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type GlobalErrorFallbackProps = {
  title?: string
  description?: string
  className?: string
}

export function GlobalErrorFallback({
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again, or return home if the problem persists.",
  className,
}: GlobalErrorFallbackProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-background px-4 py-20 font-sans antialiased",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${BRAND_TERRA}18` }}
        >
          <RouteSignalMark color={BRAND_TERRA} width={36} height={26} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Error
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Back to home</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
