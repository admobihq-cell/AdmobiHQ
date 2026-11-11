import { StyleSheet, Text, View } from "react-native"

import type { ChartPalette } from "../palette"

/** The dashed "Sample" mark on a figure that is illustrative, never measured. */
export function SampleTag({ palette }: { palette: ChartPalette }) {
  return (
    <View style={[styles.tag, { borderColor: palette.sample }]} accessibilityLabel="Sample figure">
      <Text style={[styles.text, { color: palette.sample }]}>Sample</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tag: { alignSelf: "flex-start", borderWidth: 1, borderStyle: "dashed", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  text: { fontSize: 10, fontWeight: "600" },
})
