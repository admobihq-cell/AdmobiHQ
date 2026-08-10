import { Pressable, Text } from "react-native"

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
  const styles = useThemedStyles((c) => ({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingVertical: 13,
      opacity: disabled ? 0.5 : 1,
    },
    label: { ...typography.headline, color: c.text },
  }))

  return (
    <Pressable style={styles.button} disabled={disabled} onPress={onPress}>
      <LogoGoogle size={18} color={colors.text} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}
