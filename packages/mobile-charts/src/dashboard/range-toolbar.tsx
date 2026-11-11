import { Pressable, StyleSheet, Text, View } from "react-native"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { withAlpha } from "../color"
import type { ChartPalette } from "../palette"
import { rangeLabel } from "./tones"

const DEFAULT_OPTIONS: readonly DateRangeKey[] = ["7d", "30d", "90d", "all"]

/** The date range chips every dashboard opens with: 7D, 30D, 90D, All. */
export function RangeToolbar({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  palette,
}: {
  value: DateRangeKey
  onChange: (range: DateRangeKey) => void
  options?: readonly DateRangeKey[]
  palette: ChartPalette
}) {
  const accent = palette.series[0] ?? palette.text
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option === value
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              { borderColor: selected ? accent : palette.border, backgroundColor: selected ? withAlpha(accent, 0.12) : palette.surface },
            ]}
          >
            <Text style={[styles.label, { color: selected ? accent : palette.muted }]}>{rangeLabel(option)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: { minHeight: 36, minWidth: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 18, paddingHorizontal: 12 },
  label: { fontSize: 13, fontWeight: "600" },
})
