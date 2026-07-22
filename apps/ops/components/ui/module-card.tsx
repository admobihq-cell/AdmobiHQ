import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type ModuleCardProps = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  className?: string
}

export function ModuleCard({
  href,
  label,
  description,
  icon: Icon,
  className,
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-xl border bg-card p-5 shadow-none transition-transform hover:border-primary/30 hover:bg-muted/20 active:scale-[0.99]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
          <Icon className="size-4 text-primary" aria-hidden />
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <h3 className="mt-4 font-medium">{label}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Link>
  )
}
