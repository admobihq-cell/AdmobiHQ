import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"
import type { FormFieldOption } from "@workspace/ops-contracts"

import { StatusChip } from "@/components/app/status-chip"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

type StatusPickerProps = {
  label: string
  value: string | null | undefined
  options: FormFieldOption[]
  onChange: (value: string) => Promise<void> | void
  disabled?: boolean
}

export function StatusPicker({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: StatusPickerProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    label: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
  }))

  const current = options.find((option) => option.value === value)

  const handleSelect = (next: string) => {
    if (disabled || saving || next === value) {
      setOpen(false)
      return
    }

    setSaving(true)
    void Promise.resolve(onChange(next))
      .then(() => {
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          )
        }
        setOpen(false)
      })
      .finally(() => setSaving(false))
  }

  return (
    <>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          disabled={disabled || saving}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: disabled || saving }}
        >
          <StatusChip
            label={current?.label ?? value ?? "Set status"}
            variant="primary"
          />
        </Pressable>
      </View>

      <BottomSheetPicker
        visible={open}
        onClose={() => setOpen(false)}
        title="Change status"
        options={options}
        value={value ?? ""}
        onSelect={handleSelect}
      />
    </>
  )
}
