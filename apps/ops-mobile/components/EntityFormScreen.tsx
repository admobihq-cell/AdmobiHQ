import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { FormFieldDef } from "@workspace/ops-contracts"
import { formatLabel, splitCsv } from "@workspace/ops-contracts"

import { AppLoader } from "@/components/app/app-loader"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
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
                  accessibilityRole="button"
                  accessibilityLabel={field.label}
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

      <BottomSheetPicker
        visible={selectField != null}
        onClose={() => setSelectField(null)}
        title={selectField?.label}
        options={selectField?.options ?? []}
        multi={selectField?.multi}
        value={
          selectField?.multi
            ? splitCsv(selectField ? values[selectField.name] ?? "" : "")
            : selectField
              ? values[selectField.name] ?? ""
              : ""
        }
        onSelect={(optionValue) => {
          if (!selectField) return
          if (selectField.multi) {
            const current = splitCsv(values[selectField.name] ?? "")
            const next = current.includes(optionValue)
              ? current.filter((v) => v !== optionValue)
              : [...current, optionValue]
            setValues((prev) => ({ ...prev, [selectField.name]: next.join(", ") }))
          } else {
            setValues((prev) => ({ ...prev, [selectField.name]: optionValue }))
            setSelectField(null)
          }
        }}
      />
    </ScrollView>
  )
}
