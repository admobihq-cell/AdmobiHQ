import { Pressable, StyleSheet, Text, View } from "react-native"

import { withAlpha } from "../color"
import type { ChartPalette } from "../palette"
import { alertColor, type AlertTone } from "./tones"

/**
 * A problem and its next step ("Check payout details", "Try again"). The title says what is wrong in
 * words; the colour only adds urgency.
 */
export function AlertStrip({
  tone,
  title,
  body,
  actionLabel,
  onAction,
  palette,
}: {
  tone: AlertTone
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
  palette: ChartPalette
}) {
  const color = alertColor(palette, tone)
  return (
    <View
      style={[styles.strip, { borderColor: withAlpha(color, 0.5), backgroundColor: withAlpha(color, 0.08) }]}
      accessibilityRole="alert"
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {body ? <Text style={[styles.body, { color: palette.muted }]}>{body}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" style={styles.action}>
          <Text style={[styles.actionText, { color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "600" },
  body: { fontSize: 13 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  actionText: { fontSize: 13, fontWeight: "700" },
})
