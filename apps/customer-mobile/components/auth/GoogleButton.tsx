import { Pressable, Text } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import Svg, { Path } from "react-native-svg"

import { radius, spacing, typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

type GoogleButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
}

/** Google's brand "G" mark is fixed multi-color regardless of app theme —
 * a single-tint icon here is what made the button read as colorless. */
function GoogleLogo({ size = 18, dimmed }: { size?: number; dimmed?: boolean }) {
  const opacity = dimmed ? 0.4 : 1
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        opacity={opacity}
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <Path
        fill="#34A853"
        opacity={opacity}
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <Path
        fill="#FBBC05"
        opacity={opacity}
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <Path
        fill="#EA4335"
        opacity={opacity}
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </Svg>
  )
}

export function GoogleButton({ label, onPress, disabled }: GoogleButtonProps) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  // `disabled` is composed at render time (not baked into the useThemedStyles
  // memo) for the same reason as AuthPrimaryButton — that memo only
  // recomputes on theme change, so a ternary inside the factory would freeze
  // at whatever `disabled` was on first render.
  const styles = useThemedStyles((c) => ({
    button: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      paddingVertical: 14,
    },
    buttonDisabled: {
      borderColor: c.muted,
      backgroundColor: c.muted,
    },
    label: { ...typography.headline, color: c.text },
    labelDisabled: { color: c.mutedForeground },
  }))

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.button, disabled && styles.buttonDisabled]}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 })
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 140 })
        }}
        onPress={onPress}
      >
        <GoogleLogo size={18} dimmed={disabled} />
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}
