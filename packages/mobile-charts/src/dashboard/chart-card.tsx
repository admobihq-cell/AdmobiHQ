import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"

import type { ChartPalette } from "../palette"

/**
 * A titled card around one chart. The takeaway (the chart's point in one sentence) shows above the
 * plot only when there is data, as on the web: a missing takeaway means there was nothing honest to
 * say, never a placeholder. An empty chart shows `emptyMessage` instead of a flat plot.
 */
export function ChartCard({
  title,
  description,
  takeaway,
  action,
  isEmpty,
  emptyMessage,
  children,
  palette,
}: {
  title: string
  description?: string
  takeaway?: string
  action?: ReactNode
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
  palette: ChartPalette
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.head}>
        <View style={styles.titles}>
          <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
            {title}
          </Text>
          {description ? <Text style={[styles.description, { color: palette.muted }]}>{description}</Text> : null}
        </View>
        {action}
      </View>
      {takeaway && !isEmpty ? <Text style={[styles.takeaway, { color: palette.text }]}>{takeaway}</Text> : null}
      {isEmpty ? (
        <View style={[styles.empty, { borderColor: palette.border }]}>
          <Text style={[styles.emptyText, { color: palette.muted }]}>{emptyMessage}</Text>
        </View>
      ) : (
        children
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  titles: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  description: { fontSize: 12 },
  takeaway: { fontSize: 13, fontWeight: "500" },
  empty: { minHeight: 120, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderRadius: 8, padding: 16 },
  emptyText: { fontSize: 13, textAlign: "center" },
})
