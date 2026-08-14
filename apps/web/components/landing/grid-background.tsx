import { cn } from "@workspace/ui/lib/utils"

/** Blueprint-style grid backdrop, drawn from the theme's --border token and
 * faded out toward the bottom. Originally the design-system page's inline
 * background block — extracted here since the legal pages reuse it too. */
export function GridBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.2]",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        maskImage: "linear-gradient(to bottom, black, transparent 85%)",
      }}
    />
  )
}
