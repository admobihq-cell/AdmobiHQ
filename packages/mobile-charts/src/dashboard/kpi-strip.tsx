import { StyleSheet, Text, View } from "react-native"
import type { Delta } from "@workspace/ops-contracts"

import type { DeltaGood } from "../delta"
import type { ChartPalette } from "../palette"
import { DeltaPill } from "./delta-pill"
import { SampleTag } from "./sample-tag"

export type KpiItem = {
  label: string
  value: string
  note?: string
  delta?: { delta: Delta; good: DeltaGood; format?: (change: number) => string }
  /** An illustrative figure: gets the dashed "Sample" tag. */
  sample?: boolean
}

/** One card divided into cells. A change with something to compare reads "vs last period" beside it. */
export function KpiStrip({
  items,
  palette,
  columns = 2,
}: {
  items: KpiItem[]
  palette: ChartPalette
  columns?: 2 | 3
}) {
  const cell = `${100 / columns}%` as const
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {items.map((item, i) => {
        const compares = item.delta !== undefined && item.delta.delta.change !== null
        return (
          <View
            key={item.label}
            style={[
              styles.cell,
              {
                width: cell,
                borderColor: palette.border,
                borderRightWidth: (i + 1) % columns === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopWidth: i >= columns ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <Text style={[styles.label, { color: palette.muted }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.value, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            {item.delta ? (
              <View style={styles.deltaRow}>
                <DeltaPill delta={item.delta.delta} good={item.delta.good} format={item.delta.format} palette={palette} />
                {compares ? <Text style={[styles.vs, { color: palette.muted }]}>vs last period</Text> : null}
              </View>
            ) : null}
            {item.note ? <Text style={[styles.note, { color: palette.muted }]}>{item.note}</Text> : null}
            {item.sample ? <SampleTag palette={palette} /> : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  cell: { padding: 12, gap: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 22, fontWeight: "600", fontVariant: ["tabular-nums"] },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  vs: { fontSize: 11 },
  note: { fontSize: 12 },
})
