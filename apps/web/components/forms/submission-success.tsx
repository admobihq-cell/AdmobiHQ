"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import { Check } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export type SuccessStep = {
  label: string
  /** When it happens: the promise the visitor is now waiting on. */
  when?: string
}

type SubmissionSuccessProps = {
  title: string
  /** What happens next, in order. The first step is the one they just completed. */
  steps: SuccessStep[]
  onReset: () => void
  resetLabel?: string
  className?: string
}

/**
 * Replaces a submitted lead form with a short route of what happens next:
 * done → next (pulsing) → then. Echoes the brand's path-and-node motif.
 */
export function SubmissionSuccess({
  title,
  steps,
  onReset,
  resetLabel = "Submit another response",
  className,
}: SubmissionSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The form, and the submit button that had focus, just unmounted. Land focus
  // on the outcome so screen readers announce it and phones scroll back up
  // from the bottom of a long form.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div data-visible="true" className={cn("max-w-xl", className)}>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight text-balance text-foreground outline-none"
      >
        {title}
      </h2>

      <ol className="mt-8">
        {steps.map((step, i) => {
          const done = i === 0
          const next = i === 1
          return (
            <li
              key={step.label}
              className="anim-rise relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 pb-7 last:pb-0"
              style={{ "--rise-delay": `${i * 140}ms` } as CSSProperties}
            >
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-8 bottom-1.5 left-[calc(0.75rem-0.5px)] w-px",
                    done ? "bg-linear-to-b from-primary to-border" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative mt-px flex size-6 items-center justify-center rounded-full",
                  done && "bg-primary text-primary-foreground",
                  next && "border-2 border-primary bg-background",
                  !done && !next && "border-2 border-border bg-background",
                )}
              >
                {done && <Check className="size-3.5" strokeWidth={3} />}
                {next && <span className="anim-pulse absolute -inset-0.5 rounded-full border-2 border-primary/50" />}
              </span>
              <div>
                <p className="leading-snug text-foreground">
                  {done && <span className="sr-only">Done: </span>}
                  {next && <span className="sr-only">Next: </span>}
                  {step.label}
                </p>
                {step.when && (
                  <p
                    className={cn(
                      "mt-1 text-sm tabular-nums",
                      done ? "text-muted-foreground" : "font-medium text-primary",
                    )}
                  >
                    {step.when}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={onReset}
        className="text-muted-foreground hover:text-foreground mt-10 text-sm font-medium underline underline-offset-4 decoration-border hover:decoration-current"
      >
        {resetLabel}
      </button>
    </div>
  )
}
