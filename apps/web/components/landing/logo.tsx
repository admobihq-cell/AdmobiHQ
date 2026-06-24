import {
  ROUTE_SIGNAL_NODES,
  ROUTE_SIGNAL_PATH,
  ROUTE_SIGNAL_STROKE_WIDTH,
  ROUTE_SIGNAL_VIEWBOX,
} from "@/lib/brand/geometry"
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
        viewBox={`0 0 ${ROUTE_SIGNAL_VIEWBOX.width} ${ROUTE_SIGNAL_VIEWBOX.height}`}
        width="36"
        height="25"
        aria-hidden
        className="shrink-0 text-primary"
      >
        <path
          d={ROUTE_SIGNAL_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={ROUTE_SIGNAL_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {ROUTE_SIGNAL_NODES.map((node) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="currentColor"
          />
        ))}
      </svg>
      <span className="text-lg leading-none sm:text-xl">Admobi</span>
    </span>
  )
}
