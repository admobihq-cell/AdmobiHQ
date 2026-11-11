import { useState } from "react"
import { Pressable, View } from "react-native"
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg"
import { formatCompact } from "@workspace/ops-contracts"

import { barGeometry, niceMax } from "../geometry"
import type { ChartPalette } from "../palette"
import { Legend, ValueRow, seriesColor } from "./parts"
import { useWidth } from "./use-width"

export type StackedBar = { label: string; segments: { key: string; value: number }[] }

/**
 * Bars stacked from the baseline in the order of `keys` (payouts paid / on its way, money in / out).
 * Values at or below zero are left out of the stack. Tap a bar to read its numbers. Renders nothing
 * when every bar is empty.
 */
export function StackedBars({
  bars,
  keys,
  palette,
  height = 180,
  format = formatCompact,
  accessibilityLabel,
}: {
  bars: StackedBar[]
  keys: { key: string; label: string }[]
  palette: ChartPalette
  height?: number
  format?: (value: number) => string
  accessibilityLabel?: string
}) {
  const { width, onLayout } = useWidth()
  const [selected, setSelected] = useState<number | null>(null)

  const valueOf = (bar: StackedBar, key: string) => Math.max(0, bar.segments.find((s) => s.key === key)?.value ?? 0)
  const totals = bars.map((bar) => keys.reduce((sum, k) => sum + valueOf(bar, k.key), 0))
  const maxTotal = Math.max(0, ...totals)
  if (bars.length === 0 || maxTotal <= 0) return null

  const max = niceMax(maxTotal)
  const plotH = height - 18
  const slot = width / bars.length
  const barW = Math.min(36, slot * 0.6)
  const labelEvery = Math.max(1, Math.ceil(bars.length / Math.max(1, Math.floor(width / 48))))
  const sel = selected !== null ? bars[selected] : undefined

  return (
    <View accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? keys.map((k) => k.label).join(", ")}>
      {sel ? (
        <ValueRow
          title={sel.label}
          palette={palette}
          parts={keys.map((k) => `${k.label} ${format(valueOf(sel, k.key))}`)}
        />
      ) : null}
      <Pressable onPress={(e) => setSelected(slot > 0 ? Math.min(bars.length - 1, Math.floor(e.nativeEvent.locationX / slot)) : 0)} onLayout={onLayout}>
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={plotH} y2={plotH} stroke={palette.grid} strokeWidth={1} />
          <SvgText x={0} y={10} fontSize={10} fill={palette.muted}>
            {format(max)}
          </SvgText>
          {width > 0
            ? bars.map((bar, i) => {
                const x = slot * i + (slot - barW) / 2
                let acc = 0
                return (
                  <G key={bar.label + i}>
                    {keys.map((k, ki) => {
                      const v = valueOf(bar, k.key)
                      const top = barGeometry(acc + v, 0, max, plotH)
                      const bottom = barGeometry(acc, 0, max, plotH)
                      acc += v
                      return v > 0 ? (
                        <Rect
                          key={k.key}
                          x={x}
                          y={top.y}
                          width={barW}
                          height={Math.max(0, top.h - bottom.h)}
                          fill={seriesColor(palette, ki)}
                          opacity={selected === null || selected === i ? 1 : 0.45}
                        />
                      ) : null
                    })}
                    {i % labelEvery === 0 ? (
                      <SvgText x={x + barW / 2} y={height - 3} fontSize={10} fill={palette.muted} textAnchor="middle">
                        {bar.label}
                      </SvgText>
                    ) : null}
                  </G>
                )
              })
            : null}
        </Svg>
      </Pressable>
      <Legend palette={palette} items={keys.map((k, i) => ({ label: k.label, color: seriesColor(palette, i) }))} />
    </View>
  )
}
