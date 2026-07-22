import { Pressable, StyleSheet, Text, View } from "react-native"

import { spacing, typography, useThemedStyles } from "@/lib/theme"

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
  const styles = useThemedStyles((c) => ({
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    titleRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    titleCopy: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: {
      ...typography.title,
      color: c.text,
    },
    livePill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.secondary,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.primary,
    },
    liveText: {
      ...typography.caption,
      color: c.text,
      fontWeight: "700" as const,
    },
    stats: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      padding: spacing.sm,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    stat: {
      flex: 1,
      alignItems: "center" as const,
      gap: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: c.text,
    },
    statLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 28,
      backgroundColor: c.border,
    },
    toggles: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipOff: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    chipText: {
      ...typography.label,
      color: c.mutedForeground,
    },
    chipTextOn: {
      color: c.primaryForeground,
    },
  }))

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
