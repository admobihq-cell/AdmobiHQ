import { Text, TextInput, View, type TextInputProps } from "react-native"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

export function FormInput({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const styles = useThemedStyles((c) => ({
    wrap: { gap: spacing.xs },
    label: { ...typography.label, color: c.text },
    input: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.surface,
    },
  }))

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#9DA4B7"
        autoCapitalize="none"
        {...props}
      />
    </View>
  )
}
