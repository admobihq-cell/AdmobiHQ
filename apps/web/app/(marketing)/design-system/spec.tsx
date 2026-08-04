"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * A single dimension callout: a leader tick, a token name, and its value.
 * Click (or Enter/Space) copies the raw value — the CSS var name by default,
 * or `copyValue` when the display value isn't what a caller wants pasted.
 */
export function Spec({
  name,
  value,
  copyValue,
  className,
}: {
  name: string
  value?: string
  copyValue?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textToCopy = copyValue ?? value ?? name

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard unavailable (permissions, non-secure context) — the value is
      // still fully readable, so there's nothing to recover from here.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value ? `${name}: ${value}` : name}
      className={cn(
        "group/spec flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-px w-3 shrink-0 bg-border transition-colors group-hover/spec:bg-primary"
      />
      <span
        className={cn(
          "min-w-0 truncate font-mono text-[0.7rem] text-muted-foreground",
          value ? "shrink" : "flex-1",
        )}
      >
        {name}
      </span>
      {value ? (
        <span className="min-w-0 flex-1 truncate text-right font-mono text-[0.7rem] text-foreground">
          {value}
        </span>
      ) : null}
      <span className="relative size-3 shrink-0">
        <Copy
          aria-hidden
          className={cn(
            "absolute inset-0 size-3 text-muted-foreground opacity-0 transition-opacity group-hover/spec:opacity-100",
            copied && "opacity-0",
          )}
        />
        <Check
          aria-hidden
          className={cn(
            "absolute inset-0 size-3 text-primary opacity-0 transition-opacity",
            copied && "opacity-100",
          )}
        />
      </span>
      <span className="sr-only">{copied ? "Copied" : `Copy ${textToCopy}`}</span>
    </button>
  )
}
