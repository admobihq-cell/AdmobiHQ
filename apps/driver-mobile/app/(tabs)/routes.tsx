import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Card, Pill, SampleTag, type PillTone } from "@/components/app/section"
import { RoutesMap } from "@/components/maps/routes-map"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { ROUTE_HISTORY } from "@/lib/placeholder-data"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

const WEIGHT_TONE: Record<string, PillTone> = { "High earner": "good", "Medium earner": "warning", "Low earner": "neutral" }

/** The map above, the routes below. The route figures are examples until trips are recorded, so each is tagged. */
function RoutesScreen() {
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    mapWrap: { height: 320 },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
    sectionTitle: { ...typography.headline, fontSize: 18, color: c.text },
    head: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: spacing.sm },
    name: { ...typography.headline, color: c.text, flexShrink: 1 },
    earnings: { ...typography.title, fontSize: 20, color: c.text, fontVariant: ["tabular-nums" as const] },
    meta: { ...typography.bodySm, color: c.mutedForeground },
    footer: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
  }))

  return (
    <View style={styles.root}>
      <View style={styles.mapWrap}>
        <RoutesMap />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Your routes this week
          </Text>
          <SampleTag />
        </View>
        {ROUTE_HISTORY.map((route) => (
          <Card key={route.id} gap={spacing.sm}>
            <View style={styles.head}>
              <Text style={styles.name}>{route.name}</Text>
              <Text style={styles.earnings}>{route.earnings}</Text>
            </View>
            <Text style={styles.meta}>
              {route.corridor} · {route.hours}
            </Text>
            <View style={styles.footer}>
              <Pill label={route.weight} tone={WEIGHT_TONE[route.weight] ?? "neutral"} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}

export default withProfileGate(RoutesScreen)
