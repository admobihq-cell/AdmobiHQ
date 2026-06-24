import { BRAND_CREAM, BRAND_TERRA } from "@/lib/brand/constants"
import {
  ROUTE_SIGNAL_NODES,
  ROUTE_SIGNAL_PATH,
  ROUTE_SIGNAL_STROKE_WIDTH,
  ROUTE_SIGNAL_VIEWBOX,
} from "@/lib/brand/geometry"

type RouteSignalMarkProps = {
  color: string
  width: number
  height: number
  strokeWidth?: number
}

/** Satori-compatible RouteSignal mark (curved path + two nodes). */
export function RouteSignalMark({
  color,
  width,
  height,
  strokeWidth = ROUTE_SIGNAL_STROKE_WIDTH,
}: RouteSignalMarkProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${ROUTE_SIGNAL_VIEWBOX.width} ${ROUTE_SIGNAL_VIEWBOX.height}`}
    >
      <path
        d={ROUTE_SIGNAL_PATH}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {ROUTE_SIGNAL_NODES.map((node) => (
        <circle
          key={`${node.cx}-${node.cy}`}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill={color}
        />
      ))}
    </svg>
  )
}

type BrandTileProps = {
  size: number
  /** Multiplier on ROUTE_SIGNAL_STROKE_WIDTH for legibility at small sizes. */
  strokeMultiplier?: number
  padding?: number
  borderRadius?: number
}

/** Terra rounded-square tile with cream RouteSignal mark — for favicon, apple-icon, schema logo. */
export function BrandTile({
  size,
  strokeMultiplier = 1,
  padding,
  borderRadius,
}: BrandTileProps) {
  const inset = padding ?? Math.round(size * 0.125)
  const radius = borderRadius ?? Math.round(size * 0.125)
  const markWidth = size - inset * 2
  const markHeight = Math.round(
    markWidth * (ROUTE_SIGNAL_VIEWBOX.height / ROUTE_SIGNAL_VIEWBOX.width),
  )

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: BRAND_TERRA,
        borderRadius: radius,
      }}
    >
      <RouteSignalMark
        color={BRAND_CREAM}
        width={markWidth}
        height={markHeight}
        strokeWidth={ROUTE_SIGNAL_STROKE_WIDTH * strokeMultiplier}
      />
    </div>
  )
}
