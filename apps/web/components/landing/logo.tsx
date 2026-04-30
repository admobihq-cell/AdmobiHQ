import { cn } from "@workspace/ui/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className
      )}
    >
      <span className="sr-only">Admobi</span>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        aria-hidden
        className="shrink-0 text-primary"
      >
        <circle cx="7" cy="16" r="3.5" fill="currentColor" opacity="0.9" />
        <path
          d="M12.5 16h12"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <circle cx="26" cy="16" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
      <span className="text-lg leading-none sm:text-xl">
        Ad<span className="text-primary">mobi</span>
      </span>
    </span>
  )
}
