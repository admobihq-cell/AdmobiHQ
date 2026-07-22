import { useState } from "react"
import * as Haptics from "expo-haptics"
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"

import { ChevronDown } from "@/components/icons"
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
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(58, 56, 52, 0.35)",
      justifyContent: "center" as const,
      padding: spacing.lg,
    },
    menu: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden" as const,
    },
    menuItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    menuItemActive: {
      backgroundColor: c.secondary,
    },
    menuItemPressed: {
      opacity: 0.85,
    },
    menuItemText: {
      ...typography.body,
      color: c.text,
      fontWeight: "500" as const,
    },
    menuItemTextActive: {
      color: c.primary,
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
      >
        <Text style={styles.triggerText}>{selected?.label ?? "Select view"}</Text>
        <ChevronDown color={colors.primary} size={16} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {options.map((option) => {
              const active = option.key === value
              return (
                <Pressable
                  key={option.key}
                  onPress={() => select(option.key)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    active && styles.menuItemActive,
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <Text
                    style={[styles.menuItemText, active && styles.menuItemTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}
