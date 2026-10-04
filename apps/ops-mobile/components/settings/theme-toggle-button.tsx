import { useEffect } from "react"
import { Pressable, StyleSheet } from "react-native"
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, { Circle, G, Path } from "react-native-svg"

import { useTheme } from "@/lib/theme/provider"
import { radius } from "@/lib/theme/tokens"

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)

type ThemeToggleButtonProps = {
  size?: number
}

/**
 * Sun rays retract into a crescent moon. The crescent is carved by overlaying
 * a second circle painted in the button's own background color rather than
 * an animated SVG clip-path — react-native-svg on Android doesn't reliably
 * re-run transforms on elements nested inside a <ClipPath>, which left the
 * light-mode sun permanently clipped away on device.
 */
export function ThemeToggleButton({ size = 18 }: ThemeToggleButtonProps) {
  const { colors, resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const label = isDark ? "Switch to light mode" : "Switch to dark mode"
  const progress = useSharedValue(isDark ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(isDark ? 1 : 0, {
      duration: 350,
      easing: Easing.inOut(Easing.quad),
    })
  }, [isDark, progress])

  const circleProps = useAnimatedProps(() => ({
    r: 8 + progress.value * 2,
  }))

  const biteProps = useAnimatedProps(() => ({
    opacity: progress.value,
  }))

  const raysProps = useAnimatedProps(() => ({
    opacity: 1 - progress.value,
    rotation: -100 * progress.value,
    scale: 1 - progress.value * 0.5,
  }))

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.muted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <AnimatedCircle animatedProps={circleProps} cx={16} cy={16} fill={colors.text} />
        <AnimatedCircle animatedProps={biteProps} cx={23} cy={10} r={9} fill={colors.muted} />
        <AnimatedG
          animatedProps={raysProps}
          origin="16,16"
          stroke={colors.text}
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <Path d="M16 5.5v-4" />
          <Path d="M16 30.5v-4" />
          <Path d="M1.5 16h4" />
          <Path d="M26.5 16h4" />
          <Path d="m23.4 8.6 2.8-2.8" />
          <Path d="m5.7 26.3 2.9-2.9" />
          <Path d="m5.8 5.8 2.8 2.8" />
          <Path d="m23.4 23.4 2.9 2.9" />
        </AnimatedG>
      </Svg>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
})
