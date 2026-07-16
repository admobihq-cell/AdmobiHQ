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

import { colors, radius, spacing, typography } from "@/lib/theme"

export function Screen({
  children,
  padded = true,
}: {
  children: React.ReactNode
  padded?: boolean
}) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top > 0 ? 0 : spacing.md,
          paddingBottom: insets.bottom,
        },
        padded && styles.screenPadded,
      ]}
    >
      {children}
    </View>
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>
}

export function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
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
  return <View style={[styles.card, style]}>{children}</View>
}

export function IconBox({
  icon: Icon,
  size = 18,
}: {
  icon: AppIcon
  size?: number
}) {
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
  if (!children) return null
  return <Text style={styles.error}>{children}</Text>
}

export function Field(props: TextInputProps) {
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.destructiveButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.destructiveButtonText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenPadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
  },
  sectionDescription: {
    ...typography.bodySm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyDescription: {
    ...typography.bodySm,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    ...typography.bodySm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  destructiveButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: colors.destructiveMuted,
    borderWidth: 1,
    borderColor: "rgba(192, 74, 47, 0.25)",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  destructiveButtonText: {
    color: colors.destructive,
    fontWeight: "600",
    fontSize: 15,
  },
})
