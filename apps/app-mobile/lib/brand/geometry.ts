/** Canonical RouteSignal mark — viewBox 0 0 40 28 */
export const ROUTE_SIGNAL_VIEWBOX = { width: 40, height: 28 } as const

export const ROUTE_SIGNAL_PATH = "M 6 14 Q 12 -4 19 14 T 34 14" as const

export const ROUTE_SIGNAL_NODES = [
  { cx: 6, cy: 14, r: 3.4 },
  { cx: 34, cy: 14, r: 3.4 },
] as const

export const ROUTE_SIGNAL_STROKE_WIDTH = 2.8
