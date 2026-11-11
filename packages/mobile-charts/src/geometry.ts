/**
 * Chart maths with no React in it, so it can be unit-tested. Every function returns finite numbers
 * and well-formed SVG for empty, flat, single-point and negative inputs.
 */

const fmt = (n: number): string => String(Math.round(n * 100) / 100)

/** The smallest of 1, 2, 2.5 or 5 times a power of ten that is at least `value`; 1 for nothing. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(value))
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    const candidate = Number((multiple * base).toPrecision(12))
    if (candidate >= value) return candidate
  }
  return Number((10 * base).toPrecision(12))
}

/**
 * An SVG path through `values`, evenly spaced across `width`. A `null` breaks the line, so a gap is
 * never drawn as a value. A point with no neighbours becomes a zero-length segment, which a round
 * line cap shows as a dot.
 */
export function linePath(
  values: readonly (number | null)[],
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  const count = values.length
  const span = max - min
  const x = (i: number) => (count <= 1 ? 0 : (i / (count - 1)) * width)
  const y = (v: number) => (span === 0 ? height / 2 : height - ((v - min) / span) * height)

  const segments: { x: number; y: number }[][] = []
  let run: { x: number; y: number }[] = []
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) segments.push(run)
      run = []
    } else {
      run.push({ x: x(i), y: y(v) })
    }
  })
  if (run.length) segments.push(run)

  return segments
    .map((points) =>
      points.length === 1
        ? `M${fmt(points[0]!.x)},${fmt(points[0]!.y)}l0,0`
        : points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)},${fmt(p.y)}`).join(""),
    )
    .join("")
}

/** A bar from the zero baseline to `value` on a `[min, max]` scale; negatives extend below it. */
export function barGeometry(value: number, min: number, max: number, height: number): { y: number; h: number } {
  const span = max - min
  if (!(span > 0)) return { y: height, h: 0 }
  const clamp = (n: number) => Math.min(height, Math.max(0, n))
  const yOf = (v: number) => height - ((v - min) / span) * height
  const baseline = clamp(yOf(0))
  const top = clamp(yOf(value))
  return { y: Math.min(baseline, top), h: Math.abs(baseline - top) }
}

const polar = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle - Math.PI / 2),
  y: cy + r * Math.sin(angle - Math.PI / 2),
})

/**
 * Ring segments for `values`, starting at twelve o'clock. Values at or below zero are skipped but keep
 * their `index`, so a legend can still colour by position. The ring is centred at (radius, radius).
 */
export function donutArcs(
  values: readonly number[],
  radius: number,
  thickness: number,
): { d: string; share: number; index: number }[] {
  const total = values.reduce((sum, v) => sum + (v > 0 ? v : 0), 0)
  if (total <= 0) return []

  const inner = Math.max(0, radius - thickness)
  const arcs: { d: string; share: number; index: number }[] = []
  let start = 0
  values.forEach((value, index) => {
    if (!(value > 0)) return
    const share = value / total
    // A full circle has identical start and end points, which SVG draws as nothing; stop just short.
    const sweep = Math.min(share, 0.99999) * 2 * Math.PI
    const end = start + sweep
    const large = sweep > Math.PI ? 1 : 0
    const o0 = polar(radius, radius, radius, start)
    const o1 = polar(radius, radius, radius, end)
    const i1 = polar(radius, radius, inner, end)
    const i0 = polar(radius, radius, inner, start)
    arcs.push({
      d:
        `M${fmt(o0.x)},${fmt(o0.y)}A${fmt(radius)},${fmt(radius)} 0 ${large} 1 ${fmt(o1.x)},${fmt(o1.y)}` +
        `L${fmt(i1.x)},${fmt(i1.y)}A${fmt(inner)},${fmt(inner)} 0 ${large} 0 ${fmt(i0.x)},${fmt(i0.y)}Z`,
      share,
      index,
    })
    start = end
  })
  return arcs
}
