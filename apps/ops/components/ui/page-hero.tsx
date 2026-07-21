import { cn } from "@workspace/ui/lib/utils"

type PageHeroProps = {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  variant?: "default" | "card"
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  className,
  variant = "default",
}: PageHeroProps) {
  const copy = (
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )

  if (variant === "card") {
    return (
      <section
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card shadow-none",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          {copy}
          {actions ? (
            <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      {copy}
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
