import { useMemo, useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { FormFieldDef } from "@workspace/ops-contracts"
import { formatLabel, splitCsv } from "@workspace/ops-contracts"

import { AppLoader } from "@/components/app/app-loader"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { CheckboxOff, CheckboxOn } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type EntityFormScreenProps = {
  title: string
  fields: FormFieldDef[]
  initialValues?: Record<string, string>
  submitLabel?: string
  saving?: boolean
  error?: string | null
  onDismissError?: () => void
  onSubmit: (values: Record<string, string>) => Promise<void>
}

export function EntityFormScreen({
  title,
  fields,
  initialValues = {},
  submitLabel = "Save",
  saving = false,
  error,
  onDismissError,
  onSubmit,
}: EntityFormScreenProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const field of fields) {
      next[field.name] = initialValues[field.name] ?? ""
    }
    return next
  })
  const [selectField, setSelectField] = useState<FormFieldDef | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl + insets.bottom,
      gap: spacing.md,
    },
    title: {
      ...typography.section,
      color: c.text,
      marginBottom: spacing.xs,
    },
    field: {
      gap: spacing.xs,
    },
    label: {
      ...typography.caption,
      fontWeight: "600" as const,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    input: {
      ...typography.body,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      minHeight: 48,
    },
    inputError: {
      borderColor: c.danger,
    },
    fieldError: {
      ...typography.caption,
      color: c.danger,
    },
    multiline: {
      minHeight: 120,
      textAlignVertical: "top" as const,
      paddingTop: 12,
    },
    select: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    selectValue: {
      ...typography.body,
      color: c.text,
      flex: 1,
    },
    selectPlaceholder: {
      color: c.mutedForeground,
    },
    submit: {
      marginTop: spacing.sm,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: "center" as const,
    },
    submitPressed: {
      opacity: 0.85,
    },
    submitDisabled: {
      opacity: 0.6,
    },
    submitText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
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
    optionText: {
      ...typography.body,
      color: c.text,
    },
    optionTextSelected: {
      color: c.primary,
      fontWeight: "700" as const,
    },
    optionRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
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

  const missingFields = useMemo(() => {
    return fields.filter((field) => field.required && !values[field.name]?.trim())
  }, [fields, values])
  const missingFieldNames = useMemo(
    () => new Set(missingFields.map((field) => field.name)),
    [missingFields],
  )

  const handleSubmit = () => {
    if (saving) return
    if (missingFields.length > 0) {
      setSubmitAttempted(true)
      return
    }
    void onSubmit(values)
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>

        {error ? (
          <ApiErrorBanner
            message={error}
            onDismiss={onDismissError}
          />
        ) : null}

        {submitAttempted && missingFields.length > 0 ? (
          <ApiErrorBanner
            message={`Please fill in: ${missingFields.map((field) => field.label).join(", ")}.`}
          />
        ) : null}

        {fields.map((field) => {
          const value = values[field.name] ?? ""
          const showError = submitAttempted && missingFieldNames.has(field.name)

          if (field.options?.length) {
            const selectedValues = field.multi ? splitCsv(value) : value ? [value] : []
            const selectedLabels = selectedValues.map(
              (v) => field.options?.find((option) => option.value === v)?.label ?? formatLabel(v),
            )
            return (
              <View key={field.name} style={styles.field}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Text>
                <Pressable
                  style={[styles.input, styles.select, showError && styles.inputError]}
                  onPress={() => setSelectField(field)}
                >
                  <Text
                    style={[
                      styles.selectValue,
                      selectedLabels.length === 0 && styles.selectPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedLabels.length > 0
                      ? selectedLabels.join(", ")
                      : `Select ${field.label.toLowerCase()}`}
                  </Text>
                  <Text style={styles.selectPlaceholder}>▾</Text>
                </Pressable>
                {showError ? (
                  <Text style={styles.fieldError}>{field.label} is required.</Text>
                ) : null}
              </View>
            )
          }

          return (
            <View key={field.name} style={styles.field}>
              <Text style={styles.label}>
                {field.label}
                {field.required ? " *" : ""}
              </Text>
              <TextInput
                value={value}
                onChangeText={(text) =>
                  setValues((current) => ({ ...current, [field.name]: text }))
                }
                placeholder={field.placeholder ?? field.label}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={field.type === "email" ? "email-address" : "default"}
                autoCapitalize={field.type === "email" ? "none" : "sentences"}
                autoCorrect={field.type !== "email"}
                multiline={field.type === "multiline"}
                style={[
                  styles.input,
                  field.type === "multiline" && styles.multiline,
                  showError && styles.inputError,
                ]}
              />
              {showError ? (
                <Text style={styles.fieldError}>{field.label} is required.</Text>
              ) : null}
            </View>
          )
        })}

        <Pressable
          style={({ pressed }) => [
            styles.submit,
            (pressed || saving) && styles.submitPressed,
            saving && styles.submitDisabled,
          ]}
          disabled={saving}
          onPress={handleSubmit}
        >
          {saving ? (
            <AppLoader compact message="" />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={selectField != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectField(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectField(null)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{selectField?.label}</Text>
            <ScrollView>
              {selectField?.options?.map((option) => {
                const currentValue = selectField ? values[selectField.name] ?? "" : ""
                const currentValues = selectField?.multi
                  ? splitCsv(currentValue)
                  : [currentValue]
                const selected = currentValues.includes(option.value)
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      if (!selectField) return
                      if (selectField.multi) {
                        const next = selected
                          ? currentValues.filter((v) => v !== option.value)
                          : [...currentValues, option.value]
                        setValues((current) => ({
                          ...current,
                          [selectField.name]: next.join(", "),
                        }))
                      } else {
                        setValues((current) => ({
                          ...current,
                          [selectField.name]: option.value,
                        }))
                        setSelectField(null)
                      }
                    }}
                  >
                    <View style={styles.optionRow}>
                      {selectField?.multi ? (
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
            {selectField?.multi ? (
              <Pressable style={styles.doneButton} onPress={() => setSelectField(null)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}
