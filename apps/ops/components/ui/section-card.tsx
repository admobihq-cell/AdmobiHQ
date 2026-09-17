import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

type SectionCardProps = {
  title: string
  /** Rendered as a badge beside the title. */
  count?: number
  action?: React.ReactNode
  /** Content supplies its own padding — for flush lists and tables. */
  flush?: boolean
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

export function SectionCard({
  title,
  count,
  action,
  flush = false,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className={cn("gap-0 py-0 shadow-none", className)}>
      <CardHeader className="border-b py-4">
        <CardTitle>{title}</CardTitle>
        {action || count !== undefined ? (
          <CardAction>
            {action ?? (
              <Badge variant="secondary" className="tabular-nums">
                {count}
              </Badge>
            )}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={cn(flush ? "px-0" : "py-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>
}

/** Label/value rows for a `flush` SectionCard. */
export function SectionRows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y">{children}</div>
}

export function SectionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
