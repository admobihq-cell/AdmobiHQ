import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { formatLabel } from "@workspace/ops-contracts"

import { CheckboxOff, CheckboxOn } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export type BottomSheetPickerOption = { value: string; label: string }

type BottomSheetPickerProps = {
  visible: boolean
  onClose: () => void
  title?: string
  options: BottomSheetPickerOption[]
  /** Selected value for single-select, or the full set of selected values for multi-select. */
  value: string | string[]
  multi?: boolean
  onSelect: (value: string) => void
  doneLabel?: string
}

/**
 * Shared bottom-sheet option list used by every picker/dropdown in the app
 * (entity form selects, status picker, chart view switcher). Callers own
 * their own trigger UI and open/close state; this only renders the modal
 * body and option rows so backdrop/sheet/accessibility behavior stays
 * consistent everywhere instead of being reimplemented per picker.
 */
export function BottomSheetPicker({
  visible,
  onClose,
  title,
  options,
  value,
  multi = false,
  onSelect,
  doneLabel = "Done",
}: BottomSheetPickerProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const selectedValues = Array.isArray(value) ? value : value ? [value] : []

  const styles = useThemedStyles((c) => ({
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
      maxHeight: "70%" as const,
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
    optionRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    optionText: {
      ...typography.body,
      color: c.text,
    },
    optionTextSelected: {
      color: c.primary,
      fontWeight: "700" as const,
    },
    doneButton: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 12,
      alignItems: "center" as const,
    },
    doneButtonText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
  }))

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={styles.modalSheet}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          {title ? <Text style={styles.modalTitle}>{title}</Text> : null}
          <ScrollView>
            {options.map((option) => {
              const selected = selectedValues.includes(option.value)
              return (
                <Pressable
                  key={option.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onSelect(option.value)}
                  accessibilityRole="button"
                  accessibilityState={
                    multi ? { checked: selected } : { selected }
                  }
                >
                  <View style={styles.optionRow}>
                    {multi ? (
                      selected ? (
                        <CheckboxOn size={20} color={colors.primary} />
                      ) : (
                        <CheckboxOff size={20} color={colors.mutedForeground} />
                      )
                    ) : null}
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label || formatLabel(option.value)}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
          {multi ? (
            <Pressable
              style={styles.doneButton}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.doneButtonText}>{doneLabel}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
