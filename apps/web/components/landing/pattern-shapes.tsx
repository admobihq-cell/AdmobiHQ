import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/** Decorative, theme-token-colored SVG tile patterns for section backdrops.
 * Same technique as the `skyline-windows` pattern in system-illustration.tsx —
 * a repeating <pattern> painted onto a full-bleed rect, faded with a mask so
 * it never competes with foreground copy. Siblings of grid-background.tsx.
 * Each variant echoes a Book of Shapes category (isometric, flow, node,
 * chevron, wave) but is drawn from scratch — Book of Shapes ships no stated
 * license, so nothing here is copied from it. */

type PatternProps = {
  id?: string
  className?: string
  maskImage?: string
  colorClassName?: string
}

function definePattern(
  defaultId: string,
  defaultMaskImage: string,
  tile: { width: number; height: number },
  renderTile: (colorClassName: string) => ReactNode
) {
  return function Pattern({
    id = defaultId,
    className,
    maskImage = defaultMaskImage,
    colorClassName = "text-foreground/[0.16]",
  }: PatternProps) {
    return (
      <svg
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-70 dark:opacity-45",
          className
        )}
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <defs>
          <pattern
            id={id}
            width={tile.width}
            height={tile.height}
            patternUnits="userSpaceOnUse"
          >
            {renderTile(colorClassName)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    )
  }
}

/** Isometric axis crosses — echoes GPS/precision-routing without spelling it out. */
export const IsoCrossPattern = definePattern(
  "iso-cross",
  "linear-gradient(to left, black, transparent 65%)",
  { width: 40, height: 40 },
  (colorClassName) => (
    <g
      className={colorClassName}
      stroke="currentColor"
      strokeWidth={1.1}
      vectorEffect="non-scaling-stroke"
    >
      <line x1={20} y1={6} x2={20} y2={34} />
      <line x1={20} y1={20} x2={6} y2={28} />
      <line x1={20} y1={20} x2={34} y2={28} />
    </g>
  )
)

/** Scattered dot field — echoes Book of Shapes' "Flow Dots". */
export const ScatterDotsPattern = definePattern(
  "scatter-dots",
  "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
  { width: 28, height: 28 },
  (colorClassName) => (
    <g className={colorClassName} fill="currentColor">
      <circle cx={4} cy={4} r={1.6} />
      <circle cx={18} cy={14} r={1.6} />
      <circle cx={8} cy={22} r={1.6} />
    </g>
  )
)

/** Diagonal flow lines — echoes "Flow Lines". */
export const FlowLinesPattern = definePattern(
  "flow-lines",
  "linear-gradient(to left, black, transparent 65%)",
  { width: 22, height: 22 },
  (colorClassName) => (
    <g
      className={colorClassName}
      stroke="currentColor"
      strokeWidth={1.1}
      vectorEffect="non-scaling-stroke"
    >
      <line x1={0} y1={22} x2={22} y2={0} />
      <line x1={-6} y1={6} x2={6} y2={-6} />
      <line x1={16} y1={28} x2={28} y2={16} />
    </g>
  )
)

/** Repeating chevrons — echoes "Chevron Blocks". */
export const ChevronPattern = definePattern(
  "chevron-blocks",
  "linear-gradient(to bottom, black, transparent 70%)",
  { width: 24, height: 16 },
  (colorClassName) => (
    <path
      d="M 0 4 L 6 4 L 12 12 L 18 4 L 24 4 M 0 12 L 6 12 L 12 20 L 18 12 L 24 12"
      className={colorClassName}
      stroke="currentColor"
      strokeWidth={1.1}
      fill="none"
      vectorEffect="non-scaling-stroke"
    />
  )
)

/** Small nodes joined by short edges — echoes "Node Garden". */
export const NodeGardenPattern = definePattern(
  "node-garden",
  "radial-gradient(ellipse 70% 90% at 100% 0%, black, transparent 70%)",
  { width: 46, height: 46 },
  (colorClassName) => (
    <g className={colorClassName}>
      <g
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      >
        <line x1={8} y1={10} x2={26} y2={6} />
        <line x1={26} y1={6} x2={36} y2={24} />
        <line x1={8} y1={10} x2={16} y2={34} />
        <line x1={16} y1={34} x2={36} y2={24} />
      </g>
      <g fill="currentColor">
        <circle cx={8} cy={10} r={2} />
        <circle cx={26} cy={6} r={2} />
        <circle cx={36} cy={24} r={2} />
        <circle cx={16} cy={34} r={2} />
      </g>
    </g>
  )
)
