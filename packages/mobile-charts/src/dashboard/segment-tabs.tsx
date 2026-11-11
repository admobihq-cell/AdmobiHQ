import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import type { ChartPalette } from "../palette"

/** Tabs that scroll sideways when they don't fit (Overview, Ledger, Wallets, Payouts, Tool costs). */
export function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  palette,
}: {
  tabs: { value: T; label: string; badge?: number }[]
  value: T
  onChange: (value: T) => void
  palette: ChartPalette
}) {
  const accent = palette.series[0] ?? palette.text
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const selected = tab.value === value
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.tab, { borderBottomColor: selected ? accent : "transparent" }]}
          >
            <Text style={[styles.label, { color: selected ? palette.text : palette.muted }]}>{tab.label}</Text>
            {tab.badge ? (
              <View style={[styles.badge, { backgroundColor: palette.bad }]}>
                <Text style={styles.badgeText}>{tab.badge > 99 ? "99+" : tab.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 20, paddingHorizontal: 4 },
  tab: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderBottomWidth: 2 },
  label: { fontSize: 14, fontWeight: "600" },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
})
