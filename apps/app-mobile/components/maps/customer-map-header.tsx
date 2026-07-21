import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/lib/theme"

export type MapLayerKey = "corridors" | "coverage" | "plays"

const LAYER_LABELS: Record<MapLayerKey, string> = {
  corridors: "Corridors",
  coverage: "Coverage",
  plays: "Plays",
}

type CustomerMapHeaderProps = {
  paddingTop: number
  layers: Record<MapLayerKey, boolean>
  onToggle: (key: MapLayerKey) => void
}

export function CustomerMapHeader({
  paddingTop,
  layers,
  onToggle,
}: CustomerMapHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.eyebrow}>Live coverage</Text>
          <Text style={styles.title}>Campaign map</Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Demo</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Corridors</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>12.4k</Text>
          <Text style={styles.statLabel}>Plays today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>84%</Text>
          <Text style={styles.statLabel}>Delivery</Text>
        </View>
      </View>

      <View style={styles.toggles}>
        {(Object.keys(LAYER_LABELS) as MapLayerKey[]).map((key) => {
          const on = layers[key]
          return (
            <Pressable
              key={key}
              onPress={() => onToggle(key)}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {LAYER_LABELS[key]}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  toggles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.label,
    color: colors.mutedForeground,
  },
  chipTextOn: {
    color: colors.primaryForeground,
  },
})
