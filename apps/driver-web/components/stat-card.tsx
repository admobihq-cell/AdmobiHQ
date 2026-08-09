import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

type StatCardProps = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="pb-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {hint ? (
          <p className="text-xs font-medium text-primary">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
