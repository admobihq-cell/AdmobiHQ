"use client"

import * as React from "react"
import { Sankey, Tooltip } from "recharts"
import type { FlowGraph } from "@workspace/ops-contracts"

import { DIM_TRANSITION, MARK, chartColor, defaultFormat } from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/** Fixed meanings keep their colour wherever they appear. */
const FIXED: Record<string, string> = {
  "Net margin": "var(--chart-3)",
  Shortfall: "oklch(0.72 0.16 70)",
  Unallocated: "var(--muted-foreground)",
}

function colorsFor(graph: FlowGraph): string[] {
  const used = new Set(Object.keys(FIXED))
  const perColumn = new Map<number, number>()
  return graph.nodes.map((node, i) => {
    const fixed = FIXED[node.name]
    if (fixed) return fixed
    // The hub (the column every flow passes through) is neutral; other nodes take hues in order.
    const isHub = graph.links.some((l) => l.target === i) && graph.links.some((l) => l.source === i)
    if (isHub) return "var(--muted-foreground)"
    const n = perColumn.get(node.column) ?? 0
    perColumn.set(node.column, n + 1)
    return used.has(node.name) ? "var(--muted-foreground)" : chartColor(n)
  })
}

type NodeProps = { x: number; y: number; width: number; height: number; index: number; payload: { name: string; value: number } }
type LinkProps = {
  sourceX: number
  targetX: number
  sourceY: number
  targetY: number
  sourceControlX: number
  targetControlX: number
  linkWidth: number
  index: number
}

/**
 * Where money went: sources on the left, a hub, outputs on the right, ribbons sized by amount.
 * Labels sit beside the nodes in text colours (never the series colour), with the amount and,
 * on the output side, the share. Hovering a ribbon lifts it and fades the rest.
 */
export function SankeyChart({
  graph,
  valueFormatter = defaultFormat,
  className,
}: {
  graph: FlowGraph
  valueFormatter?: (value: number) => string
  className?: string
}) {
  const [activeLink, setActiveLink] = React.useState<number | null>(null)
  const colors = React.useMemo(() => colorsFor(graph), [graph])
  const maxColumn = Math.max(0, ...graph.nodes.map((n) => n.column))
  const hubTotal = graph.links
    .filter((l) => graph.nodes[l.source]?.column === 0)
    .reduce((sum, l) => sum + l.value, 0)
  const ref = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(640)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, Math.floor(entry!.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Node = ({ x, y, width: w, height, index, payload }: NodeProps) => {
    const column = graph.nodes[index]?.column ?? 0
    const right = column === maxColumn
    const share = right && hubTotal > 0 ? ` · ${Math.round((payload.value / hubTotal) * 100)}%` : ""
    return (
      <g>
        <rect x={x} y={y} width={w} height={Math.max(2, height)} rx={MARK.radius} fill={colors[index]} />
        <text
          x={right ? x - 8 : x + w + 8}
          y={y + height / 2}
          textAnchor={right ? "end" : "start"}
          dominantBaseline="middle"
          className="fill-foreground text-xs"
        >
          <tspan className="font-medium">{payload.name}</tspan>
          <tspan className="fill-muted-foreground" dx={6}>
            {valueFormatter(payload.value)}
            {share}
          </tspan>
        </text>
      </g>
    )
  }

  const Link = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }: LinkProps) => {
    const link = graph.links[index]
    const color = link ? colors[link.source] : "var(--muted-foreground)"
    const opacity = activeLink === null ? 0.28 : activeLink === index ? 0.5 : 0.12
    return (
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={opacity}
        style={DIM_TRANSITION}
        onMouseEnter={() => setActiveLink(index)}
        onMouseLeave={() => setActiveLink(null)}
      />
    )
  }

  const height = Math.max(240, Math.min(420, graph.nodes.length * 44))

  return (
    <div ref={ref} className={cn("w-full overflow-hidden", className)}>
      <Sankey
        width={width}
        height={height}
        data={graph}
        nodeWidth={10}
        nodePadding={18}
        iterations={32}
        margin={{ top: 8, right: 170, bottom: 8, left: 150 }}
        node={(props: NodeProps) => <Node {...props} />}
        link={(props: LinkProps) => <Link {...props} />}
      >
        <Tooltip
          content={({ payload }) => {
            const item = payload?.[0]?.payload as
              | { source?: { name: string }; target?: { name: string }; value?: number; name?: string }
              | undefined
            if (!item || item.value === undefined) return null
            const title = item.source && item.target ? `${item.source.name} → ${item.target.name}` : item.name
            return (
              <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md">
                <div className="font-medium">{title}</div>
                <div className="font-mono tabular-nums">{valueFormatter(item.value)}</div>
              </div>
            )
          }}
        />
      </Sankey>
    </div>
  )
}
