/** `#rrggbb` or `#rgb` with an opacity, as an rgba() string; anything else comes back unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)
  if (!m) return color
  const hex = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!
  const n = parseInt(hex, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** Heatmap cell opacity: a faint tint for nothing, full colour for the biggest cell. */
export function heatAlpha(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0.06
  return Math.min(1, 0.12 + 0.88 * (value / max))
}
