import { useEffect } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { colors, radius } from "@/lib/theme"

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

export function SkeletonListRows({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock width={40} height={40} borderRadius={20} />
          <View style={styles.rowContent}>
            <SkeletonBlock width="70%" height={14} />
            <SkeletonBlock width="45%" height={12} style={styles.rowGap} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.muted,
  },
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
})
