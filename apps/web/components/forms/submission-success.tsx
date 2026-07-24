import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type SubmissionSuccessProps = {
  icon: LucideIcon
  title: string
  message: string
  onReset: () => void
  resetLabel?: string
  className?: string
}

export function SubmissionSuccess({
  icon: Icon,
  title,
  message,
  onReset,
  resetLabel = "Submit another response",
  className,
}: SubmissionSuccessProps) {
  return (
    <div
      role="status"
      className={cn(
        "max-w-xl rounded-2xl border border-border bg-card p-8 sm:p-10",
        className,
      )}
    >
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="text-foreground mt-5 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 leading-relaxed">{message}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/blog">
            Read the blog
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/products-solutions">
            Learn more about Admobi
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="text-muted-foreground hover:text-foreground mt-6 text-sm font-medium underline-offset-4 hover:underline"
      >
        {resetLabel}
      </button>
    </div>
  )
}
