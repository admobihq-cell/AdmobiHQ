import { useEffect } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { radius, spacing, useThemedStyles } from "@/lib/theme"

type SkeletonBlockProps = {
  width?: number | `${number}%`
  height?: number
  style?: ViewStyle
  borderRadius?: number
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  style,
  borderRadius = radius.sm,
}: SkeletonBlockProps) {
  const styles = useThemedStyles((c) => ({
    block: {
      backgroundColor: c.muted,
    },
  }))
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true)
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  )
}

/**
 * Icon tile + two-line row — matches `NotificationRow` and the support
 * case rows (icon tile, subject line, meta line).
 */
export function SkeletonListRows({ count = 6 }: { count?: number }) {
  return (
    <View style={staticStyles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={staticStyles.row}>
          <SkeletonBlock width={36} height={36} borderRadius={radius.md} />
          <View style={staticStyles.rowContent}>
            <SkeletonBlock width="65%" height={14} />
            <SkeletonBlock width="40%" height={12} style={staticStyles.rowGap} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Bordered card row — icon tile, two-line copy, trailing status chip —
 * matches the support case rows in `settings/support.tsx`. Unlike
 * `SkeletonListRows`, this has no built-in horizontal padding since it's
 * meant to sit inside a screen that already pads its content.
 */
export function SkeletonCaseRows({ count = 5 }: { count?: number }) {
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
  }))

  return (
    <View style={staticStyles.caseList}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock width={36} height={36} borderRadius={radius.md} />
          <View style={staticStyles.rowContent}>
            <SkeletonBlock width="55%" height={14} />
            <SkeletonBlock width="30%" height={12} style={staticStyles.rowGap} />
          </View>
          <SkeletonBlock width={54} height={20} borderRadius={radius.full} />
        </View>
      ))}
    </View>
  )
}

/**
 * Title + status chip header, two icon+text meta rows, and a divided
 * metrics footer — matches the campaign card in `campaigns/index.tsx`.
 */
export function SkeletonCampaignCards({ count = 4 }: { count?: number }) {
  const styles = useThemedStyles((c) => ({
    card: {
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    metrics: {
      flexDirection: "row" as const,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: spacing.lg,
    },
  }))

  return (
    <View style={staticStyles.cardList}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={staticStyles.cardHeader}>
            <SkeletonBlock width="58%" height={17} />
            <SkeletonBlock width={64} height={22} borderRadius={999} />
          </View>
          <View style={staticStyles.metaRow}>
            <SkeletonBlock width={14} height={14} borderRadius={4} />
            <SkeletonBlock width="38%" height={12} />
          </View>
          <View style={staticStyles.metaRow}>
            <SkeletonBlock width={14} height={14} borderRadius={4} />
            <SkeletonBlock width="52%" height={12} />
          </View>
          <View style={styles.metrics}>
            <View style={staticStyles.metric}>
              <SkeletonBlock width={70} height={10} />
              <SkeletonBlock width={50} height={15} style={staticStyles.metricValueGap} />
            </View>
            <View style={staticStyles.metric}>
              <SkeletonBlock width={50} height={10} />
              <SkeletonBlock width={60} height={15} style={staticStyles.metricValueGap} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

const staticStyles = StyleSheet.create({
  list: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowContent: {
    flex: 1,
  },
  rowGap: {
    marginTop: 8,
  },
  caseList: {
    gap: spacing.md,
  },
  cardList: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricValueGap: {
    marginTop: 2,
  },
})
