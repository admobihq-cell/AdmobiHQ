import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type SettingsRowProps = {
  href: string
  label: string
  description?: string
  icon: LucideIcon
  className?: string
}

export function SettingsRow({
  href,
  label,
  description,
  icon: Icon,
  className,
}: SettingsRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
