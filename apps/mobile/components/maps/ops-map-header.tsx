import { Pressable, StyleSheet, Text, View } from "react-native"

import {
  BASEMAP_ORDER,
  BASEMAP_PRESETS,
  type BasemapId,
} from "@workspace/geo"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

type OpsMapHeaderProps = {
  paddingTop: number
  basemap: BasemapId
  onBasemapChange: (id: BasemapId) => void
}

export function OpsMapHeader({
  paddingTop,
  basemap,
  onBasemapChange,
}: OpsMapHeaderProps) {
  const styles = useThemedStyles((c) => ({
    header: {
      paddingHorizontal: spacing.md,
      paddingTop,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    titleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    title: {
      ...typography.title,
      fontSize: 20,
      color: c.text,
    },
    livePill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.secondary,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    liveText: {
      ...typography.caption,
      color: c.text,
      fontWeight: "700" as const,
    },
    row: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 6,
      alignItems: "center" as const,
    },
    label: {
      fontSize: 10,
      fontWeight: "700" as const,
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
      color: c.mutedForeground,
      marginRight: 4,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipOn: {
      borderColor: c.primary,
      backgroundColor: c.secondary,
    },
    chipText: {
      ...typography.label,
      color: c.mutedForeground,
    },
    chipTextOn: {
      color: c.text,
      fontWeight: "600" as const,
    },
  }))

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Ops map</Text>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Demo</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Map</Text>
        {BASEMAP_ORDER.map((id) => {
          const on = basemap === id
          return (
            <Pressable
              key={id}
              onPress={() => onBasemapChange(id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {BASEMAP_PRESETS[id].label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
