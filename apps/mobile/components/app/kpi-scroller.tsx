import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Pressable } from "react-native"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"

import { SkeletonBlock } from "@/components/app/skeleton"
import { colors, radius, spacing, typography } from "@/lib/theme"

export type KpiItem = {
  key: string
  label: string
  value: number
  onPress?: () => void
}

type KpiScrollerProps = {
  items: KpiItem[]
  loading?: boolean
}

export function KpiScroller({ items, loading }: KpiScrollerProps) {
  if (loading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.card}>
            <SkeletonBlock width={48} height={28} />
            <SkeletonBlock width={64} height={12} style={styles.skeletonLabel} />
          </View>
        ))}
      </ScrollView>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      decelerationRate="fast"
      snapToInterval={120}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            item.onPress?.()
          }}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    width: 108,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.accent,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  label: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  skeletonLabel: {
    marginTop: spacing.sm,
  },
})
