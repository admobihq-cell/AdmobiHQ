import { StyleSheet, Text, View } from "react-native"
import type { StatusTone } from "@workspace/ops-contracts"

import { withAlpha } from "../color"
import type { ChartPalette } from "../palette"
import { statusColor } from "./tones"

/** A status in words. Colour reinforces the word and is never the only cue. */
export function StatusPill({ label, tone, palette }: { label: string; tone: StatusTone; palette: ChartPalette }) {
  const color = statusColor(palette, tone)
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.12) }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: "600" },
})
