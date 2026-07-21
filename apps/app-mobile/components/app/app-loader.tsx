import { useEffect } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

import { colors, spacing, typography } from "@/lib/theme"

type AppLoaderProps = {
  message?: string
  compact?: boolean
}

export function AppLoader({
  message = "Starting up",
  compact = false,
}: AppLoaderProps) {
  const logoScale = useSharedValue(1)
  const barProgress = useSharedValue(0)

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    )
    barProgress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [logoScale, barProgress])

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }))

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (barProgress.value - 0.5) * 48 }],
    opacity: 0.55 + barProgress.value * 0.45,
  }))

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={styles.title}>Admobi</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  compact: {
    paddingVertical: spacing.xl,
  },
  logoWrap: {
    width: 220,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 200,
    height: 100,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  message: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  track: {
    width: 120,
    height: 3,
    backgroundColor: colors.muted,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: spacing.lg,
  },
  bar: {
    width: 48,
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
})
