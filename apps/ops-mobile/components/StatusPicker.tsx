import { useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { FormFieldOption } from "@workspace/ops-contracts"

import { StatusChip } from "@/components/app/status-chip"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

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
  const insets = useSafeAreaInsets()
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end" as const,
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingBottom: insets.bottom + spacing.md,
    },
    modalTitle: {
      ...typography.section,
      color: c.text,
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    option: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    optionSelected: {
      backgroundColor: `${c.primary}12`,
    },
    optionText: {
      ...typography.body,
      color: c.text,
    },
    optionTextSelected: {
      color: c.primary,
      fontWeight: "700" as const,
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
        >
          <StatusChip
            label={current?.label ?? value ?? "Set status"}
            variant="primary"
          />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Change status</Text>
            <ScrollView>
              {options.map((option) => {
                const selected = option.value === value
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
