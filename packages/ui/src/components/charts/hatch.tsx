/**
 * A 45° hatch for tracks and monthly bars. Drop `<defs><HatchPattern id=… /></defs>` into an
 * SVG and fill with `url(#id)`. It strokes with a token, so it follows both themes and forced
 * colours. It is a texture, not a data colour: pair it with a labelled value.
 */
export function HatchPattern({
  id,
  color = "var(--muted-foreground)",
  spacing = 6,
  opacity = 0.35,
}: {
  id: string
  color?: string
  spacing?: number
  opacity?: number
}) {
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={spacing}
      height={spacing}
      patternTransform="rotate(45)"
    >
      <line x1={0} y1={0} x2={0} y2={spacing} stroke={color} strokeOpacity={opacity} strokeWidth={1.5} />
    </pattern>
  )
}
