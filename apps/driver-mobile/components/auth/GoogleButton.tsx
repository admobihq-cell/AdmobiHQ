import { Pressable, Text } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

import { LogoGoogle } from "@/components/icons"
import { radius, spacing, typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"
import { useThemeColors } from "@/lib/theme/provider"

type GoogleButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
}

export function GoogleButton({ label, onPress, disabled }: GoogleButtonProps) {
  const colors = useThemeColors()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const styles = useThemedStyles((c) => ({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      paddingVertical: 14,
      opacity: disabled ? 0.5 : 1,
    },
    label: { ...typography.headline, color: c.text },
  }))

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.button}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 })
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 140 })
        }}
        onPress={onPress}
      >
        <LogoGoogle size={18} color={colors.text} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}
