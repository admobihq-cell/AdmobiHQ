"use client"

import { MinusIcon, PlusIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

/** Whole units only — screens, bikes, and days don't come in fractions. Rounds and clamps every input, typed or stepped, so a pasted "3.7" or an out-of-range value can't slip through. */
export function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function NumberStepper({
  id,
  label,
  value,
  min,
  max,
  hint,
  onChange,
  className,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  hint?: string
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clampInt(value - 1, min, max))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-input text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <MinusIcon className="size-4" aria-hidden />
        </button>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clampInt(Number(e.target.value), min, max))}
          className="h-10 w-16 text-center tabular-nums"
        />
        <button
          type="button"
          onClick={() => onChange(clampInt(value + 1, min, max))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-input text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <PlusIcon className="size-4" aria-hidden />
        </button>
      </div>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  )
}
