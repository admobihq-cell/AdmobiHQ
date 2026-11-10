import { cn } from "@workspace/ui/lib/utils"

/** Marks an illustrative figure in place, so a sample number is never read as real. */
export function SampleTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border border-dashed border-muted-foreground/40 px-1 text-[10px] leading-4 font-medium text-muted-foreground",
        className,
      )}
    >
      Sample
    </span>
  )
}

/** A card or KPI label with the tag after it. */
export function SampleLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <SampleTag />
    </span>
  )
}
