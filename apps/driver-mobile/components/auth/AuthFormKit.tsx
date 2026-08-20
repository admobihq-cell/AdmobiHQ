import { useState } from "react"
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import type { AppIcon } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** Bordered container that groups a form step — mirrors the ops-mobile Card. */
export function AuthCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
  }))
  return <View style={[styles.card, style]}>{children}</View>
}

export function AuthIconBadge({ icon: Icon }: { icon: AppIcon }) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    badge: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.accentSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }))
  return (
    <View style={styles.badge}>
      <Icon color={colors.primary} size={20} />
    </View>
  )
}

export function AuthLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    label: { ...typography.label, color: c.mutedForeground },
  }))
  return <Text style={styles.label}>{children}</Text>
}

export function AuthErrorText({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    error: { ...typography.bodySm, color: c.danger },
  }))
  if (!children) return null
  return <Text style={styles.error}>{children}</Text>
}

type AuthTextFieldProps = TextInputProps & {
  icon?: AppIcon
}

/** Labeled-elsewhere text input with a leading icon and a real keyboard-focus ring. */
export function AuthTextField({ icon: Icon, style, onFocus, onBlur, ...props }: AuthTextFieldProps) {
  const colors = useThemeColors()
  const [focused, setFocused] = useState(false)
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    rowFocused: { borderColor: c.ring },
    rowBlurred: { borderColor: c.border },
    input: {
      flex: 1,
      color: c.text,
      paddingVertical: 13,
      fontSize: 16,
    },
  }))

  return (
    <View style={[styles.row, focused ? styles.rowFocused : styles.rowBlurred]}>
      {Icon ? <Icon color={focused ? colors.primary : colors.mutedForeground} size={18} /> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.mutedForeground}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        {...props}
      />
    </View>
  )
}

function usePressScale() {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return {
    animatedStyle,
    onPressIn: () => {
      scale.value = withTiming(0.97, { duration: 100 })
    },
    onPressOut: () => {
      scale.value = withTiming(1, { duration: 140 })
    },
  }
}

export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale()
  const styles = useThemedStyles((c) => ({
    button: {
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingVertical: 15,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      opacity: disabled ? 0.5 : 1,
    },
    label: { ...typography.headline, color: c.primaryForeground },
  }))

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.button}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
      >
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}

export function AuthSecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const styles = useThemedStyles((c) => ({
    button: {
      paddingVertical: 10,
      alignItems: "center" as const,
      opacity: disabled ? 0.5 : 1,
    },
    label: { ...typography.bodySm, color: c.mutedForeground, fontWeight: "600" as const },
  }))

  return (
    <Pressable style={styles.button} disabled={disabled} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}
