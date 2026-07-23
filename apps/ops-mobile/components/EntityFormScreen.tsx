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
import { formatLabel } from "@workspace/ops-contracts"

import { AppLoader } from "@/components/app/app-loader"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
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
  }))

  const fieldErrors = useMemo(() => {
    const missing = fields
      .filter((field) => field.required && !values[field.name]?.trim())
      .map((field) => field.label)
    return missing
  }, [fields, values])

  const handleSubmit = () => {
    if (fieldErrors.length > 0 || saving) return
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

        {fields.map((field) => {
          const value = values[field.name] ?? ""

          if (field.options?.length) {
            const selected = field.options.find((option) => option.value === value)
            return (
              <View key={field.name} style={styles.field}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Text>
                <Pressable
                  style={[styles.input, styles.select]}
                  onPress={() => setSelectField(field)}
                >
                  <Text
                    style={[
                      styles.selectValue,
                      !selected && styles.selectPlaceholder,
                    ]}
                  >
                    {selected?.label ?? `Select ${field.label.toLowerCase()}`}
                  </Text>
                  <Text style={styles.selectPlaceholder}>▾</Text>
                </Pressable>
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
                ]}
              />
            </View>
          )
        })}

        <Pressable
          style={({ pressed }) => [
            styles.submit,
            (pressed || saving) && styles.submitPressed,
            (saving || fieldErrors.length > 0) && styles.submitDisabled,
          ]}
          disabled={saving || fieldErrors.length > 0}
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
                const selected = values[selectField.name] === option.value
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      setValues((current) => ({
                        ...current,
                        [selectField.name]: option.value,
                      }))
                      setSelectField(null)
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label || formatLabel(option.value)}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}
