import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"
import type { FormFieldOption } from "@workspace/ops-contracts"

import {
  StatusChip,
  type StatusChipVariant,
} from "@/components/app/status-chip"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import {
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

type StatusPickerProps = {
  label: string
  value: string | null | undefined
  options: FormFieldOption[]
  onChange: (value: string) => Promise<void> | void
  disabled?: boolean
  /** Maps a status value to the same semantic chip color used in list rows, so status color-coding stays consistent between list and detail. Defaults to "primary" if not provided. */
  getVariant?: (value: string | null | undefined) => StatusChipVariant
}

export function StatusPicker({
  label,
  value,
  options,
  onChange,
  disabled = false,
  getVariant,
}: StatusPickerProps) {
  const colors = useThemeColors()
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
            Haptics.NotificationFeedbackType.Success
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
          style={({ pressed }) => [
            {
              flexDirection: "row" as const,
              alignItems: "center" as const,
              gap: spacing.xs,
            },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: disabled || saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
          <StatusChip
            label={current?.label ?? value ?? "Set status"}
            variant={getVariant ? getVariant(value) : "primary"}
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
