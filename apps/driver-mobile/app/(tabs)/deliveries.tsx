import { Redirect } from "expo-router"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Card, Pill, SampleTag } from "@/components/app/section"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { usePlatformFlags } from "@/lib/flags"
import { SAMPLE_DELIVERY_JOBS } from "@/lib/placeholder-data"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** Behind the `deliveries` platform flag: a preview of jobs, every figure a tagged sample. */
function DeliveriesScreen() {
  const flags = usePlatformFlags()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
    title: { ...typography.title, fontSize: 26, color: c.text },
    body: { ...typography.body, color: c.mutedForeground },
    top: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    feeWrap: { alignItems: "flex-end" as const, gap: 4 },
    fee: { ...typography.title, fontSize: 24, color: c.text, fontVariant: ["tabular-nums" as const] },
    route: { flexDirection: "row" as const, gap: spacing.md },
    rail: { width: 14, alignItems: "center" as const, paddingVertical: 6 },
    line: { width: 2, flex: 1, backgroundColor: c.border, marginVertical: 2 },
    stops: { flex: 1, gap: spacing.md },
    stopLabel: { ...typography.caption, color: c.mutedForeground },
    stopText: { ...typography.body, color: c.text },
    disabledButton: {
      minHeight: 48,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    disabledButtonText: { ...typography.section, color: c.mutedForeground },
  }))

  // Not a 404: a shared link should just land on the tab that's actually
  // live right now, same behavior as driver-web's /deliveries route.
  if (!flags.deliveries) {
    return <Redirect href="/" />
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: spacing.sm }}>
        <Pill label="Preview, not live yet" tone="neutral" />
        <Text style={styles.title} accessibilityRole="header">
          Delivery jobs
        </Text>
        <Text style={styles.body}>
          This is how jobs will look once Admobi Deliveries ships: accept a pickup near you, carry it alongside your
          screen, and get paid on top of your ad earnings. Dispatch isn&apos;t built yet, so these are examples.
        </Text>
      </View>

      {SAMPLE_DELIVERY_JOBS.map((job) => (
        <Card key={job.id}>
          <View style={styles.top}>
            <Pill label="Available" tone="good" />
            <View style={styles.feeWrap}>
              <Text style={styles.fee}>{job.fee}</Text>
              <SampleTag />
            </View>
          </View>

          <View style={styles.route} accessible accessibilityLabel={`Pick up at ${job.pickup}, drop off at ${job.dropoff}`}>
            <View style={styles.rail}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
              <View style={styles.line} />
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.bg }} />
            </View>
            <View style={styles.stops}>
              <View>
                <Text style={styles.stopLabel}>Pick up</Text>
                <Text style={styles.stopText}>{job.pickup}</Text>
              </View>
              <View>
                <Text style={styles.stopLabel}>Drop off</Text>
                <Text style={styles.stopText}>{job.dropoff}</Text>
              </View>
            </View>
          </View>

          <View style={styles.disabledButton} accessibilityState={{ disabled: true }}>
            <Text style={styles.disabledButtonText}>Accept: coming soon</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  )
}

export default withProfileGate(DeliveriesScreen)
