import { Button } from "@workspace/ui/components/button"

export function StepShell({
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  nextLoading,
  error,
}: {
  title: string
  description: string
  children: React.ReactNode
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  error?: string | null
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-5">{children}</div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          loading={nextLoading}
          loadingText="Saving…"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}
