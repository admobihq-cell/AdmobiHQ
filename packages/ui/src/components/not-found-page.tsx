import { ArrowLeft } from "lucide-react"

import { RouteSignalMark } from "@workspace/ui/brand/admobi-mark"
import { BRAND_TERRA } from "@workspace/ui/brand/constants"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type NotFoundPageProps = {
  title?: string
  description?: string
  homeHref?: string
  homeLabel?: string
  className?: string
  compact?: boolean
}

export function NotFoundPage({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or may have moved.",
  homeHref = "/",
  homeLabel = "Back to home",
  className,
  compact = false,
}: NotFoundPageProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-4 py-20 sm:py-28",
        compact ? "min-h-0" : "min-h-[60vh]",
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
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <Button asChild>
          <a href={homeHref}>
            <ArrowLeft data-icon="inline-start" />
            {homeLabel}
          </a>
        </Button>
      </div>
    </div>
  )
}
