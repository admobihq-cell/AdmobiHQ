import { cn } from "@workspace/ui/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span className="sr-only">Admobi</span>
      <svg
        viewBox="0 0 40 28"
        width="36"
        height="25"
        aria-hidden
        className="shrink-0 text-primary"
      >
        <path
          d="M 6 14 Q 12 -4 19 14 T 34 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6" cy="14" r="3.4" fill="currentColor" />
        <circle cx="34" cy="14" r="3.4" fill="currentColor" />
      </svg>
      <span className="text-lg leading-none sm:text-xl">Admobi</span>
    </span>
  )
}
