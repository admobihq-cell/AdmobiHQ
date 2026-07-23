import { useState } from "react"
import * as Haptics from "expo-haptics"
import { Platform, Pressable, Text, View } from "react-native"

import { ChevronDown } from "@/components/icons"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export type DropdownOption = {
  key: string
  label: string
}

type ViewDropdownProps = {
  options: DropdownOption[]
  value: string
  onChange: (key: string) => void
}

export function ViewDropdown({ options, value, onChange }: ViewDropdownProps) {
  const [open, setOpen] = useState(false)
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    trigger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    triggerPressed: {
      opacity: 0.85,
    },
    triggerText: {
      ...typography.label,
      color: c.text,
      fontWeight: "600" as const,
    },
    single: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.secondary,
    },
    singleText: {
      ...typography.label,
      color: c.text,
      fontWeight: "600" as const,
    },
  }))
  const selected = options.find((option) => option.key === value)

  if (options.length <= 1) {
    return (
      <View style={styles.single}>
        <Text style={styles.singleText}>{selected?.label ?? options[0]?.label}</Text>
      </View>
    )
  }

  function select(key: string) {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync()
    }
    onChange(key)
    setOpen(false)
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel={selected?.label ?? "Select view"}
      >
        <Text style={styles.triggerText}>{selected?.label ?? "Select view"}</Text>
        <ChevronDown color={colors.primary} size={16} />
      </Pressable>

      <BottomSheetPicker
        visible={open}
        onClose={() => setOpen(false)}
        options={options.map((option) => ({ value: option.key, label: option.label }))}
        value={value}
        onSelect={select}
      />
    </>
  )
}
