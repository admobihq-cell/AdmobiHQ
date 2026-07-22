import type { AppIcon } from "@/components/icons"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const layoutStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenHeader: {
    alignItems: "flex-end",
    marginBottom: spacing.sm,
  },
  screenPadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
})

export function Screen({
  children,
  padded = true,
  showThemeToggle = true,
}: {
  children: React.ReactNode
  padded?: boolean
  showThemeToggle?: boolean
}) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  return (
    <View
      style={[
        layoutStyles.screen,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top > 0 ? 0 : spacing.md,
          paddingBottom: insets.bottom,
        },
        padded && layoutStyles.screenPadded,
      ]}
    >
      {showThemeToggle ? (
        <View style={layoutStyles.screenHeader}>
          <ThemeToggleButton />
        </View>
      ) : null}
      {children}
    </View>
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
      marginBottom: spacing.xs,
    },
  }))
  return <Text style={styles.eyebrow}>{children}</Text>
}

export function Title({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    title: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: c.text,
      letterSpacing: -0.4,
      marginBottom: spacing.sm,
    },
  }))
  return <Text style={styles.title}>{children}</Text>
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    subtitle: {
      ...typography.body,
      color: c.mutedForeground,
      marginBottom: spacing.lg,
    },
  }))
  return <Text style={styles.subtitle}>{children}</Text>
}

export function Label({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    label: {
      ...typography.label,
      color: c.mutedForeground,
      marginBottom: spacing.xs,
    },
  }))
  return <Text style={styles.label}>{children}</Text>
}

export function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  const styles = useThemedStyles((c) => ({
    sectionHeader: {
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.section,
      color: c.text,
    },
    sectionDescription: {
      ...typography.bodySm,
      color: c.mutedForeground,
      marginTop: spacing.xs,
    },
  }))
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
    </View>
  )
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.lg,
    },
  }))
  return <View style={[styles.card, style]}>{children}</View>
}

export function IconBox({
  icon: Icon,
  size = 18,
}: {
  icon: AppIcon
  size?: number
}) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }))
  return (
    <View style={styles.iconBox}>
      <Icon color={colors.primary} size={size} strokeWidth={2} />
    </View>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: AppIcon
  title: string
  description?: string
}) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    emptyState: {
      alignItems: "center" as const,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    emptyIconBox: {
      width: 56,
      height: 56,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: spacing.md,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "600" as const,
      textAlign: "center" as const,
    },
    emptyDescription: {
      ...typography.bodySm,
      color: c.mutedForeground,
      textAlign: "center" as const,
      marginTop: spacing.xs,
    },
  }))
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Icon color={colors.mutedForeground} size={24} strokeWidth={1.75} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
    </View>
  )
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((c) => ({
    error: {
      color: c.danger,
      ...typography.bodySm,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
  }))
  if (!children) return null
  return <Text style={styles.error}>{children}</Text>
}

export function Field(props: TextInputProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    input: {
      backgroundColor: c.surface,
      borderColor: c.input,
      borderWidth: 1,
      borderRadius: radius.md,
      color: c.text,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      marginBottom: spacing.md,
      fontSize: 16,
    },
  }))
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={styles.input}
      autoCapitalize="none"
      {...props}
    />
  )
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon: Icon,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  icon?: AppIcon
}) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    button: {
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    buttonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "600" as const,
    },
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
      {Icon ? (
        <Icon color={colors.primaryForeground} size={16} strokeWidth={2.25} />
      ) : null}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  icon: Icon,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  icon?: AppIcon
}) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    secondaryButton: {
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    secondaryButtonText: {
      color: c.text,
      fontSize: 15,
      fontWeight: "600" as const,
    },
  }))
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && layoutStyles.buttonDisabled,
        pressed && !disabled && layoutStyles.pressed,
      ]}
    >
      {Icon ? <Icon color={colors.text} size={16} strokeWidth={2.25} /> : null}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  )
}

export function DestructiveButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const styles = useThemedStyles((c) => ({
    destructiveButton: {
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: "center" as const,
      marginTop: spacing.lg,
      backgroundColor: c.destructiveMuted,
      borderWidth: 1,
      borderColor: "rgba(192, 74, 47, 0.25)",
    },
    destructiveButtonText: {
      color: c.destructive,
      fontWeight: "600" as const,
      fontSize: 15,
    },
  }))
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.destructiveButton,
        disabled && layoutStyles.buttonDisabled,
        pressed && !disabled && layoutStyles.pressed,
      ]}
    >
      <Text style={styles.destructiveButtonText}>{label}</Text>
    </Pressable>
  )
}
