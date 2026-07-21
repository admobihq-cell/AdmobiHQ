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
import { colors, radius, spacing, typography } from "@/lib/theme"

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

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  triggerPressed: {
    opacity: 0.85,
  },
  triggerText: {
    ...typography.label,
    color: colors.text,
    fontWeight: "600",
  },
  single: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  singleText: {
    ...typography.label,
    color: colors.text,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(58, 56, 52, 0.35)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemActive: {
    backgroundColor: colors.secondary,
  },
  menuItemPressed: {
    opacity: 0.85,
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "500",
  },
  menuItemTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
})
