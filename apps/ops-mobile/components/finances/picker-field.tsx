import { useState } from "react"
import { Pressable, Text } from "react-native"

import { BottomSheetPicker, type BottomSheetPickerOption } from "@/components/ui/bottom-sheet-picker"
import { Label } from "@/components/ui"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

/** A label and a tap-to-choose row that opens the shared bottom-sheet option list. */
export function PickerField({
  label,
  title,
  placeholder,
  options,
  value,
  onSelect,
  disabled,
}: {
  label: string
  title?: string
  placeholder: string
  options: BottomSheetPickerOption[]
  value: string
  onSelect: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  const styles = useThemedStyles((c) => ({
    trigger: {
      backgroundColor: c.background,
      borderColor: c.input,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      marginBottom: spacing.md,
      minHeight: 44,
      justifyContent: "center" as const,
    },
    text: { ...typography.body, color: selected ? c.text : c.mutedForeground },
  }))

  return (
    <>
      <Label>{label}</Label>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      >
        <Text style={styles.text} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
      </Pressable>
      <BottomSheetPicker
        visible={open}
        onClose={() => setOpen(false)}
        title={title ?? label}
        options={options}
        value={value}
        onSelect={(next) => {
          onSelect(next)
          setOpen(false)
        }}
      />
    </>
  )
}
