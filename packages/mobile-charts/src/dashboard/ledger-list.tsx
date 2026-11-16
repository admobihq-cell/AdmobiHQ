import type { ReactElement } from "react"
import { FlatList, Pressable, StyleSheet, Text, View, type RefreshControlProps } from "react-native"

import { withAlpha } from "../color"
import type { ChartPalette } from "../palette"

/**
 * A filterable, pageable list of ledger-style rows (payouts, transactions). Use it as the screen's
 * main scroller, not inside another ScrollView: `onEndReached` loads the next page.
 */
export function LedgerList<T>({
  rows,
  keyOf,
  renderRow,
  filters,
  filter,
  onFilter,
  onEndReached,
  emptyMessage,
  palette,
  header,
  refreshControl,
}: {
  rows: T[]
  keyOf: (row: T) => string
  renderRow: (row: T) => ReactElement
  filters?: { value: string; label: string; count?: number }[]
  filter?: string
  onFilter?: (value: string) => void
  onEndReached?: () => void
  emptyMessage: string
  palette: ChartPalette
  /** Anything that belongs above the filters (tabs, range toolbar, action buttons). It scrolls with the list. */
  header?: ReactElement
  /** Pull to refresh, e.g. `<RefreshControl refreshing={...} onRefresh={...} />`. */
  refreshControl?: ReactElement<RefreshControlProps>
}) {
  const accent = palette.series[0] ?? palette.text
  return (
    <FlatList
      data={rows}
      keyExtractor={keyOf}
      renderItem={({ item }) => renderRow(item)}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={refreshControl}
      ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />}
      ListHeaderComponent={
        <View>
          {header}
          {filters && onFilter ? (
          <View style={styles.filters}>
            {filters.map((f) => {
              const selected = f.value === filter
              return (
                <Pressable
                  key={f.value}
                  onPress={() => onFilter(f.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    { borderColor: selected ? accent : palette.border, backgroundColor: selected ? withAlpha(accent, 0.12) : palette.surface },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? accent : palette.muted }]}>
                    {f.label}
                    {f.count !== undefined ? ` ${f.count}` : ""}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: palette.muted }]}>{emptyMessage}</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 12 },
  chip: { minHeight: 36, justifyContent: "center", borderWidth: 1, borderRadius: 18, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: "600" },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, textAlign: "center" },
})
