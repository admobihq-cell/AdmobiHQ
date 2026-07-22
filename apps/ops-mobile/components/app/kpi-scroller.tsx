import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Pressable } from "react-native"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"

import { SkeletonBlock } from "@/components/app/skeleton"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

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
  const styles = useThemedStyles((c) => ({
    scroll: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    card: {
      width: 108,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    cardPressed: {
      backgroundColor: c.accent,
    },
    value: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: c.text,
      fontVariant: ["tabular-nums"] as const,
    },
    label: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: spacing.xs,
      fontWeight: "600" as const,
    },
    skeletonLabel: {
      marginTop: spacing.sm,
    },
  }))

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
