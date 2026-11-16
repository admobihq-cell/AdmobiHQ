"use client"

import { cn } from "@workspace/ui/lib/utils"

const MAX_WHOLE_DIGITS = 9

/**
 * What the person meant, as a plain number string: digits, plus at most one point and two
 * decimals when `decimals`. Commas, spaces, letters and a second point are dropped, so a typed
 * comma is simply ignored. Without decimals everything from the first point on is dropped
 * ("10000.50" → "10000", never "1000050").
 */
export function cleanKes(raw: string, decimals: boolean): string {
  const [whole = "", ...rest] = raw.replace(/[^0-9.]/g, "").split(".")
  const int = whole.replace(/^0+(?=\d)/, "").slice(0, MAX_WHOLE_DIGITS)
  if (!decimals || rest.length === 0) return int
  return `${int || "0"}.${rest.join("").slice(0, 2)}`
}

/** "10000.5" → "10,000.5". */
export function groupKes(clean: string): string {
  const [whole = "", fraction] = clean.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}

/** Clean string → number; "" → NaN so an empty field is never a valid amount. */
export const kesValue = (clean: string) => (clean === "" ? Number.NaN : Number(clean))

/**
 * A KES amount with a fixed currency prefix, grouped as you type. Holds the clean string
 * (`value` / `onValueChange`), shows the grouped one, and keeps the caret beside the digit
 * you were typing next to instead of throwing it to the end on every reformat.
 */
export function KesAmountInput({
  value,
  onValueChange,
  decimals = false,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  value: string
  onValueChange: (clean: string) => void
  decimals?: boolean
}) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium text-muted-foreground"
      >
        KES
      </span>
      <input
        {...props}
        type="text"
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        spellCheck={false}
        value={groupKes(value)}
        onChange={(event) => {
          const el = event.currentTarget
          const caret = el.selectionStart ?? el.value.length
          const meaningfulBeforeCaret = el.value.slice(0, caret).replace(/[^0-9.]/g, "").length
          const clean = cleanKes(el.value, decimals)
          const shown = groupKes(clean)
          // Write the DOM now: an ignored keystroke (a comma) leaves state unchanged, and React
          // would otherwise restore the old text with the caret at the end.
          el.value = shown
          let pos = 0
          for (let seen = 0; pos < shown.length && seen < meaningfulBeforeCaret; pos++) {
            if (shown[pos] !== ",") seen++
          }
          el.setSelectionRange(pos, pos)
          onValueChange(clean)
        }}
        className={cn(
          "h-14 w-full min-w-0 rounded-xl border border-input bg-transparent pr-4 pl-15 text-3xl font-semibold tracking-tight tabular-nums caret-primary transition-colors outline-none",
          "placeholder:font-normal placeholder:text-muted-foreground/60 selection:bg-primary/20",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
        )}
      />
    </div>
  )
}
