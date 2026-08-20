import { useState } from "react"
import {
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import type { AppIcon } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** Brand illustration for a form step — undraw-style artwork, decorative only. */
export function AuthIllustration({ source }: { source: ImageSourcePropType }) {
  return (
    <Image
      source={source}
      style={{ width: "100%", height: 168, alignSelf: "center" }}
      resizeMode="contain"
      importantForAccessibility="no"
    />
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
      backgroundColor: c.mutedSurface,
      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
    },
    rowFocused: { borderColor: c.ring, backgroundColor: c.surface },
    rowBlurred: {},
    input: {
      flex: 1,
      color: c.text,
      paddingVertical: 15,
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
      borderRadius: radius.xl,
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
