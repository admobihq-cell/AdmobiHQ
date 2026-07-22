import { AlertCircle, X } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

type ApiErrorBannerProps = {
  message: string
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
}

export function ApiErrorBanner({
  message,
  onDismiss,
  onRetry,
  className,
}: ApiErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          Retry
        </Button>
      ) : null}
      {onDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 text-destructive hover:bg-destructive/10"
        >
          <X />
        </Button>
      ) : null}
    </div>
  )
}
