import { useState } from "react"
import { Pressable, View } from "react-native"
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg"
import { formatCompact, type DailyPoint } from "@workspace/ops-contracts"

import { linePath, niceMax } from "../geometry"
import type { ChartPalette } from "../palette"
import { Legend, ValueRow, seriesColor } from "./parts"
import { useWidth } from "./use-width"

export type TrendSeries = {
  key: string
  label: string
  /** The same measure for the period before, drawn dashed and muted beneath the line. */
  previousKey?: string
  format?: (value: number) => string
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "UTC" })

/**
 * One line per series over days, with its previous period dashed beneath. Tap a day to read its values
 * above the chart. Renders nothing when no series has a number.
 */
export function TrendChart({
  points,
  series,
  palette,
  height = 180,
  accessibilityLabel,
}: {
  points: DailyPoint[]
  series: TrendSeries[]
  palette: ChartPalette
  height?: number
  accessibilityLabel?: string
}) {
  const { width, onLayout } = useWidth()
  const [selected, setSelected] = useState<number | null>(null)

  const keys = series.flatMap((s) => (s.previousKey ? [s.key, s.previousKey] : [s.key]))
  const finite = keys.flatMap((k) => points.map((p) => num(p[k]))).filter((v): v is number => v !== null)
  if (finite.length === 0) return null

  const max = niceMax(Math.max(...finite))
  const min = Math.min(0, ...finite)
  const plotH = height - 18
  const last = points.length - 1
  const pick = (x: number) =>
    setSelected(last <= 0 || width <= 0 ? 0 : Math.max(0, Math.min(last, Math.round((x / width) * last))))
  const sel = selected !== null ? points[selected] : undefined
  const selX = selected !== null && last > 0 ? (selected / last) * width : 0
  const first = points[0]
  const final = points[last]

  return (
    <View accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? `${series.map((s) => s.label).join(", ")} by day`}>
      {sel ? (
        <ValueRow
          title={dayLabel(sel.day)}
          palette={palette}
          parts={series.map((s) => {
            const v = num(sel[s.key])
            return `${s.label} ${v === null ? "–" : (s.format ?? formatCompact)(v)}`
          })}
        />
      ) : null}
      <Pressable onPress={(e) => pick(e.nativeEvent.locationX)} onLayout={onLayout}>
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => (
            <Line key={f} x1={0} x2={width} y1={plotH * (1 - f)} y2={plotH * (1 - f)} stroke={palette.grid} strokeWidth={1} />
          ))}
          <SvgText x={0} y={10} fontSize={10} fill={palette.muted}>
            {formatCompact(max)}
          </SvgText>
          {width > 0
            ? series.map((s, i) => (
                <G key={s.key}>
                  {s.previousKey ? (
                    <Path
                      d={linePath(points.map((p) => num(p[s.previousKey!])), width, plotH, min, max)}
                      stroke={palette.muted}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : null}
                  <Path
                    d={linePath(points.map((p) => num(p[s.key])), width, plotH, min, max)}
                    stroke={seriesColor(palette, i)}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </G>
              ))
            : null}
          {selected !== null ? <Line x1={selX} x2={selX} y1={0} y2={plotH} stroke={palette.muted} strokeWidth={1} /> : null}
          {first ? (
            <SvgText x={0} y={height - 3} fontSize={10} fill={palette.muted}>
              {dayLabel(first.day)}
            </SvgText>
          ) : null}
          {last > 0 && final ? (
            <SvgText x={width} y={height - 3} fontSize={10} fill={palette.muted} textAnchor="end">
              {dayLabel(final.day)}
            </SvgText>
          ) : null}
        </Svg>
      </Pressable>
      {series.length > 1 ? (
        <Legend palette={palette} items={series.map((s, i) => ({ label: s.label, color: seriesColor(palette, i) }))} />
      ) : null}
    </View>
  )
}
