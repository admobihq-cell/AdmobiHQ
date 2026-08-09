import { useEffect } from "react"
import { Pressable, StyleSheet } from "react-native"
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, { Circle, ClipPath, Defs, G, Path } from "react-native-svg"

import { useTheme } from "@/lib/theme/provider"
import { radius, spacing } from "@/lib/theme/tokens"

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)
const AnimatedPath = Animated.createAnimatedComponent(Path)

type ThemeToggleButtonProps = {
  size?: number
}

/** Sun rays retract into a crescent moon — same animation as the web toggle, rebuilt with react-native-svg + reanimated since Framer Motion can't run here. */
export function ThemeToggleButton({ size = 22 }: ThemeToggleButtonProps) {
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

  const clipProps = useAnimatedProps(() => ({
    x: -12 * progress.value,
    y: 10 * progress.value,
  }))

  const circleProps = useAnimatedProps(() => ({
    r: 8 + progress.value * 2,
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
        <Defs>
          <ClipPath id="themeToggleClip">
            <AnimatedPath animatedProps={clipProps} d="M0-5h30a1 1 0 0 0 9 13v24H0Z" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#themeToggleClip)">
          <AnimatedCircle animatedProps={circleProps} cx={16} cy={16} fill={colors.text} />
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
        </G>
      </Svg>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
})
