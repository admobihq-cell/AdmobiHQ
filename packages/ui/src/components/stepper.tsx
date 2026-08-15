import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export type StepperStep = {
  label: string
  status: "complete" | "current" | "upcoming"
}

/** Presentational step indicator for multi-step flows (e.g. driver-web's
 * profile-setup stepper). No state of its own — the caller owns the current
 * step index and derives each step's status. */
export function Stepper({
  steps,
  className,
}: {
  steps: StepperStep[]
  className?: string
}) {
  return (
    <ol className={cn("flex w-full items-center", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                step.status === "complete" &&
                  "border-primary bg-primary text-primary-foreground",
                step.status === "current" &&
                  "border-primary text-primary",
                step.status === "upcoming" &&
                  "border-border text-muted-foreground",
              )}
              aria-current={step.status === "current" ? "step" : undefined}
            >
              {step.status === "complete" ? (
                <Check className="size-4" aria-hidden />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                step.status === "upcoming" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "mx-2 h-px flex-1 transition-colors",
                step.status === "complete" ? "bg-primary" : "bg-border",
              )}
              aria-hidden
            />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
