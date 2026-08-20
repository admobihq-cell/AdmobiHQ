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

import { radius, spacing, useThemeColors, useThemedStyles } from "@/lib/theme"

const layoutStyles = {
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
} as const

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

/** Flat filled text input — auth screens only, mirrors customer/driver-mobile's AuthTextField. */
export function AuthTextField({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const colors = useThemeColors()
  const [focused, setFocused] = useState(false)
  const styles = useThemedStyles((c) => ({
    input: {
      backgroundColor: c.mutedSurface,
      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: radius.xl,
      color: c.text,
      paddingHorizontal: spacing.md,
      paddingVertical: 13,
      fontSize: 16,
    },
    inputFocused: { borderColor: c.ring, backgroundColor: c.surface },
    inputBlurred: {},
  }))
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={[styles.input, focused ? styles.inputFocused : styles.inputBlurred, style]}
      autoCapitalize="none"
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
  )
}

/** Username + fixed domain suffix — flat fill to match AuthTextField. */
export function AuthUsernameField({
  value,
  onChangeText,
  domain,
  autoFocus,
  onSubmitEditing,
}: {
  value: string
  onChangeText: (text: string) => void
  domain: string
  autoFocus?: boolean
  onSubmitEditing?: () => void
}) {
  const colors = useThemeColors()
  const [focused, setFocused] = useState(false)
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: c.mutedSurface,
      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
    },
    rowFocused: { borderColor: c.ring, backgroundColor: c.surface },
    rowBlurred: {},
    input: {
      flex: 1,
      color: c.text,
      paddingVertical: 13,
      fontSize: 16,
    },
    domain: {
      color: c.mutedForeground,
      fontSize: 16,
      fontWeight: "500" as const,
    },
  }))
  return (
    <View style={[styles.row, focused ? styles.rowFocused : styles.rowBlurred]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="username"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="email-address"
        returnKeyType="go"
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      <Text style={styles.domain}>{domain}</Text>
    </View>
  )
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
  const styles = useThemedStyles((c) => ({
    button: {
      backgroundColor: c.primary,
      borderRadius: radius.xl,
      paddingVertical: 15,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: spacing.sm,
    },
    label: { color: c.primaryForeground, fontSize: 16, fontWeight: "600" as const },
  }))
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && layoutStyles.buttonDisabled,
        pressed && !disabled && layoutStyles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
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
      marginTop: spacing.sm,
    },
    label: { color: c.mutedForeground, fontSize: 14, fontWeight: "600" as const },
  }))
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && layoutStyles.buttonDisabled,
        pressed && !disabled && layoutStyles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}
