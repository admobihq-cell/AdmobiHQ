import { cn } from "@workspace/ui/lib/utils"

import type { Flight } from "@/components/campaigns/flight"

/**
 * A flight drawn as a route: start node, end node, and a filled line up to today. The one place
 * the brand's "signal moving through the city" shows up in the app, so it stays a plain line and
 * two dots rather than a progress bar. `active` is false for anything not approved, which keeps a
 * draft's or rejected brief's dates from reading as a booked flight.
 */
export function FlightTrack({
  flight,
  active,
  size = "sm",
  className,
}: {
  flight: Flight
  active: boolean
  size?: "sm" | "lg"
  className?: string
}) {
  const lg = size === "lg"
  const running = active && flight.kind === "running"
  const ended = active && flight.kind === "ended"
  const fill = running ? flight.fraction : ended ? 1 : 0
  const node = cn("absolute top-1/2 -translate-y-1/2 rounded-full", lg ? "size-3" : "size-2")

  return (
    <div
      aria-hidden
      className={cn("relative w-full", lg ? "h-4" : "h-3", className)}
    >
      {flight.kind === "unscheduled" ? (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-border" />
      ) : (
        <>
          <div
            className={cn(
              "absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-border",
              lg ? "h-1" : "h-0.5",
            )}
          />
          {fill > 0 ? (
            <div
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 rounded-full",
                lg ? "h-1" : "h-0.5",
                ended ? "bg-foreground/35" : "bg-primary",
              )}
              style={{ width: `${fill * 100}%` }}
            />
          ) : null}
          <span
            className={cn(
              node,
              "left-0",
              running ? "bg-primary" : ended ? "bg-foreground/35" : "border-2 border-border bg-background",
              active && flight.kind === "upcoming" && "border-primary",
            )}
          />
          <span
            className={cn(
              node,
              "right-0",
              ended ? "bg-foreground/35" : "border-2 border-border bg-background",
            )}
          />
          {running ? (
            <span
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${flight.fraction * 100}%` }}
            >
              {/* The pulse says "on air right now"; it's the only motion on the board. */}
              <span
                className={cn(
                  "absolute inset-0 rounded-full bg-primary/40 animate-ping motion-reduce:hidden",
                  "[animation-duration:2s]",
                )}
              />
              <span
                className={cn(
                  "relative block rounded-full bg-primary ring-4 ring-primary/15",
                  lg ? "size-3.5" : "size-2.5",
                )}
              />
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}
