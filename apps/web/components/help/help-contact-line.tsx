import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

type HelpContactLineProps = {
  className?: string
  prompt?: string
}

export function HelpContactLine({
  className,
  prompt = "Still stuck?",
}: HelpContactLineProps) {
  return (
    <p className={cn("text-muted-foreground text-sm leading-relaxed", className)}>
      {prompt}{" "}
      <Link
        href="/help/contact"
        className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        Contact the team
      </Link>
    </p>
  )
}
