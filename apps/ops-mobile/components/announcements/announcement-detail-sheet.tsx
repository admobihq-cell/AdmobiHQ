import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { announcementDelivery, formatDateTime, formatLabel, type AnnouncementDto } from "@workspace/ops-contracts"

import { AnnouncementPreview } from "@/components/announcements/announcement-preview"
import { X } from "@/components/icons"
import { SecondaryButton } from "@/components/ui"
import { useChartPalette } from "@/lib/chart-palette"
import { radius, spacing, typography, useThemeColors } from "@/lib/theme"

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`

/** One past broadcast: exactly what was sent (merge tags rendered with sample values), how it went, and who sent it. */
export function AnnouncementDetailSheet({ announcement: a, onClose }: { announcement: AnnouncementDto | null; onClose: () => void }) {
  const colors = useThemeColors()
  const palette = useChartPalette()
  const d = a ? announcementDelivery(a) : null

  return (
    <Modal visible={a !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={styles.top}>
          <Text style={[typography.headline, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {a?.title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <X color={colors.mutedForeground} size={24} />
          </Pressable>
        </View>
        {a && d ? (
          <ScrollView contentContainerStyle={styles.content}>
            <AnnouncementPreview title={a.title} body={a.body} imageUri={a.image_url} targetApps={a.target_apps} timestamp={formatDateTime(a.created_at)} />

            <View style={{ gap: spacing.sm }}>
              <View style={styles.deliveryHead}>
                <Text style={[styles.heading, { color: colors.text }]}>Delivery</Text>
                {d.target > 0 ? (
                  <Text style={{ color: colors.text, fontVariant: ["tabular-nums"] }}>
                    <Text style={{ fontWeight: "700" }}>{Math.round(d.deliveredPct)}%</Text>
                    <Text style={{ color: colors.mutedForeground }}>{`  ${d.delivered.toLocaleString()} of ${d.target.toLocaleString()}`}</Text>
                  </Text>
                ) : null}
              </View>
              {d.target === 0 ? (
                <Text style={{ color: colors.mutedForeground }}>No one had the selected apps installed.</Text>
              ) : (
                <>
                  <View
                    style={[styles.bar, { backgroundColor: colors.muted }]}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`${d.delivered} of ${d.target} delivered, ${d.invalid} unreachable, ${d.unconfirmed} unconfirmed`}
                  >
                    <View style={{ width: `${d.deliveredPct}%`, backgroundColor: palette.series[0] }} />
                    <View style={{ width: `${d.invalidPct}%`, backgroundColor: palette.bad }} />
                  </View>
                  <Legend color={palette.series[0]!} text={`${plural(d.delivered, "recipient")} reached`} />
                  {d.invalid > 0 ? <Legend color={palette.bad} text={`${plural(d.invalid, "device")} no longer registered, removed`} /> : null}
                  {d.unconfirmed > 0 ? <Legend color={palette.grid} text={`${plural(d.unconfirmed, "push")} awaiting a receipt`} /> : null}
                </>
              )}
            </View>

            <View style={{ gap: 6 }}>
              {[
                ["Category", formatLabel(a.category)],
                ["Sent by", a.sent_by_email],
                ["Sent", formatDateTime(a.created_at)],
                ["Status", a.deleted_at ? `Deleted ${formatDateTime(a.deleted_at)}` : formatLabel(a.status)],
              ].map(([label, value]) => (
                <View key={label} style={styles.fact}>
                  <Text style={{ color: colors.mutedForeground }}>{label}</Text>
                  <Text style={{ color: colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
                </View>
              ))}
            </View>
            <SecondaryButton label="Close" onPress={onClose} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  )
}

function Legend({ color, text }: { color: string; text: string }) {
  const colors = useThemeColors()
  return (
    <View style={styles.legend}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: spacing.lg },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg },
  heading: { fontSize: 14, fontWeight: "600" },
  deliveryHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  bar: { height: 8, borderRadius: radius.full, overflow: "hidden", flexDirection: "row" },
  legend: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
})
