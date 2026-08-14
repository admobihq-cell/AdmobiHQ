import { Redirect } from "expo-router"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { MapPin, PackageCheck } from "@/components/icons"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { usePlatformFlags } from "@/lib/flags"
import { SAMPLE_DELIVERY_JOBS } from "@/lib/placeholder-data"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

function DeliveriesScreen() {
  const flags = usePlatformFlags()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
    badge: {
      alignSelf: "flex-start" as const,
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    title: { ...typography.title, color: c.text },
    body: { ...typography.body, color: c.mutedForeground },
    card: {
      padding: spacing.md,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    feeRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    fee: { ...typography.body, fontWeight: "700" as const, color: c.primary },
    statusPill: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    stopRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    stopText: { ...typography.body, color: c.text },
    disabledButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
      paddingVertical: spacing.sm,
      alignItems: "center" as const,
    },
    disabledButtonText: { ...typography.caption, color: c.mutedForeground, fontWeight: "600" as const },
  }))

  // Not a 404 — a shared link should just land on the tab that's actually
  // live right now, same behavior as driver-web's /deliveries route.
  if (!flags.deliveries) {
    return <Redirect href="/" />
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.badge}>Preview · not yet live</Text>
        <Text style={styles.title}>Delivery jobs</Text>
        <Text style={styles.body}>
          A preview of how delivery jobs will look once Admobi Deliveries ships —
          accept a pickup near you, carry it alongside your screen, and get paid
          on top of your ad earnings. Dispatch isn't built yet.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {SAMPLE_DELIVERY_JOBS.map((job) => (
          <View key={job.id} style={styles.card}>
            <View style={styles.feeRow}>
              <Text style={styles.statusPill}>Available</Text>
              <Text style={styles.fee}>{job.fee}</Text>
            </View>
            <View style={styles.stopRow}>
              <MapPin color={colors.mutedForeground} size={14} />
              <Text style={styles.stopText}>{job.pickup}</Text>
            </View>
            <View style={styles.stopRow}>
              <PackageCheck color={colors.mutedForeground} size={14} />
              <Text style={styles.stopText}>{job.dropoff}</Text>
            </View>
            <View style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>Accept — coming soon</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

export default withProfileGate(DeliveriesScreen)
