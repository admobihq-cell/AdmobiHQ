import { Pressable, StyleSheet, Text, View } from "react-native"

import type { ChartPalette } from "../palette"

/** A title with a progress line (flight progress, budget used). `progress` is 0 to 1 and is clamped. */
export function ProgressCard({
  title,
  subtitle,
  progress,
  caption,
  onPress,
  palette,
}: {
  title: string
  subtitle?: string
  progress: number
  caption?: string
  onPress?: () => void
  palette: ChartPalette
}) {
  const pct = Math.round(Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * 100)
  const body = (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, { color: palette.muted }]} numberOfLines={1}>{subtitle}</Text> : null}
      <View
        style={[styles.track, { backgroundColor: palette.grid }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: palette.series[0] }} />
      </View>
      {caption ? <Text style={[styles.caption, { color: palette.muted }]}>{caption}</Text> : null}
    </View>
  )
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  title: { fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 12 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 2 },
  caption: { fontSize: 12 },
})
