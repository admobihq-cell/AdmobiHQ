import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { RoutesMap } from "@/components/maps/routes-map"
import { ROUTE_HISTORY } from "@/lib/placeholder-data"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

export default function RoutesScreen() {
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    mapWrap: { height: 320 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.sm,
    },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    card: {
      padding: spacing.md,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 2,
    },
    name: { ...typography.section, color: c.text },
    meta: { ...typography.caption, color: c.mutedForeground },
    footerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: 4,
    },
    earnings: { ...typography.body, fontWeight: "700" as const, color: c.primary },
    weight: { ...typography.caption, color: c.mutedForeground, fontWeight: "600" as const },
  }))

  return (
    <View style={styles.root}>
      <View style={styles.mapWrap}>
        <RoutesMap />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Route breakdown</Text>
        {ROUTE_HISTORY.map((route) => (
          <View key={route.id} style={styles.card}>
            <Text style={styles.name}>{route.name}</Text>
            <Text style={styles.meta}>{route.corridor}</Text>
            <Text style={styles.meta}>{route.hours}</Text>
            <View style={styles.footerRow}>
              <Text style={styles.earnings}>{route.earnings}</Text>
              <Text style={styles.weight}>{route.weight}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
