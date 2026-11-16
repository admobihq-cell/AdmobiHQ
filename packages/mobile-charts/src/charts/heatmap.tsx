import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { formatCompact, type HeatCell } from "@workspace/ops-contracts"

import { heatAlpha, withAlpha } from "../color"
import type { ChartPalette } from "../palette"

/**
 * A grid shaded by value. As on the web, a cell's `x` is its row label and `y` its column label
 * (market x time of day). A cell with no data is hatched-looking (dashed outline, no fill) rather than
 * the faintest tint, so "no data" reads differently from "very little". Tap a cell to read its value.
 * Renders nothing when every cell is empty.
 */
export function Heatmap({
  cells,
  rows,
  columns,
  palette,
  format = formatCompact,
  accessibilityLabel,
}: {
  cells: HeatCell[]
  rows: string[]
  columns: string[]
  palette: ChartPalette
  format?: (value: number) => string
  accessibilityLabel?: string
}) {
  const [selected, setSelected] = useState<{ row: string; column: string } | null>(null)

  const byKey = new Map(cells.map((c) => [`${c.x}\u0000${c.y}`, c.value]))
  const valueAt = (row: string, column: string) => byKey.get(`${row}\u0000${column}`) ?? null
  const max = Math.max(0, ...cells.map((c) => (c.value !== null && c.value > 0 ? c.value : 0)))
  if (max <= 0 || rows.length === 0 || columns.length === 0) return null

  const tint = palette.series[0] ?? palette.text
  const sel = selected ? { ...selected, value: valueAt(selected.row, selected.column) } : null

  return (
    <View accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? `${rows.length} by ${columns.length} heatmap`}>
      <Text style={[styles.caption, { color: palette.text }]}>
        {sel ? `${sel.row} · ${sel.column}: ${sel.value === null ? "No data" : format(sel.value)}` : "Tap a cell for its value"}
      </Text>
      <View style={styles.line}>
        <View style={styles.rowLabel} />
        {columns.map((c) => (
          <Text key={c} style={[styles.colLabel, { color: palette.muted }]} numberOfLines={1}>
            {c}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row} style={styles.line}>
          <Text style={[styles.rowLabel, { color: palette.text }]} numberOfLines={1}>
            {row}
          </Text>
          {columns.map((column) => {
            const v = valueAt(row, column)
            return (
              <Pressable
                key={column}
                onPress={() => setSelected({ row, column })}
                style={[
                  styles.cell,
                  v === null
                    ? { borderColor: palette.border, borderStyle: "dashed", borderWidth: 1 }
                    : { backgroundColor: withAlpha(tint, heatAlpha(v, max)) },
                ]}
                accessibilityLabel={`${row}, ${column}: ${v === null ? "no data" : format(v)}`}
              />
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  caption: { fontSize: 12, marginBottom: 6 },
  line: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  rowLabel: { width: 84, fontSize: 12 },
  colLabel: { flex: 1, fontSize: 10, textAlign: "center" },
  cell: { flex: 1, height: 28, borderRadius: 4 },
})
