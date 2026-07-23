import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"
import { formatDateTime, formatLabel } from "@workspace/ops-contracts"
import type { FormFieldOption } from "@workspace/ops-contracts"

import { AppLoader } from "@/components/app/app-loader"
import { GroupedSection } from "@/components/app/grouped-list"
import { StatusChip } from "@/components/app/status-chip"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { Pencil, Trash } from "@/components/icons"
import { StatusPicker } from "@/components/StatusPicker"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type DetailField = {
  label: string
  value: string | null | undefined
  copyable?: boolean
  callable?: boolean
}

export type DetailSection = {
  title: string
  fields: DetailField[]
}

type EntityDetailProps<T> = {
  load: (id: number) => Promise<T>
  remove?: (id: number) => Promise<unknown>
  title: (item: T) => string
  chips?: (item: T) => Array<{ label: string; variant?: "default" | "primary" | "muted" }>
  sections: (item: T) => DetailSection[]
  editHref?: (id: number) => string
  statusOptions?: FormFieldOption[]
  onStatusChange?: (id: number, status: string) => Promise<T>
  getStatus?: (item: T) => string | null | undefined
}

export function EntityDetail<T>({
  load,
  remove,
  title,
  chips,
  sections,
  editHref,
  statusOptions,
  onStatusChange,
  getStatus,
}: EntityDetailProps<T>) {
  const router = useRouter()
  const navigation = useNavigation()
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    centered: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
      padding: spacing.lg,
    },
    heroCard: {
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: c.text,
      letterSpacing: -0.3,
    },
    chips: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    fieldRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    fieldList: {
      overflow: "hidden" as const,
    },
    fieldSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: spacing.md,
    },
    fieldLabel: {
      ...typography.label,
      color: c.mutedForeground,
      marginBottom: spacing.xs,
    },
    fieldValue: {
      ...typography.body,
      color: c.text,
      fontWeight: "500" as const,
    },
    fieldActions: {
      flexDirection: "row" as const,
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    actionButton: {
      paddingVertical: 4,
    },
    actionText: {
      ...typography.caption,
      fontWeight: "600" as const,
      color: c.primary,
    },
    placeholder: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    placeholderText: {
      ...typography.bodySm,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
  }))
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number.parseInt(rawId ?? "", 10)
  const [item, setItem] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItem = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setError("Invalid record id")
      setLoading(false)
      return
    }
    setError(null)
    try {
      setItem(await load(id))
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setLoading(false)
    }
  }, [id, load])

  const handleRetry = () => {
    setLoading(true)
    void fetchItem()
  }

  useEffect(() => {
    void fetchItem()
  }, [fetchItem])

  const handleDelete = useCallback(() => {
    if (!remove || !item) return

    Alert.alert(
      "Delete record",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeleting(true)
            void (async () => {
              try {
                await remove(id)
                if (Platform.OS !== "web") {
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  )
                }
                router.back()
              } catch (err) {
                setError(formatOpsError(err, API_URL))
              } finally {
                setDeleting(false)
              }
            })()
          },
        },
      ],
    )
  }, [remove, item, id, router])

  useLayoutEffect(() => {
    if (!item) return

    navigation.setOptions({
      title: title(item),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {editHref ? (
            <Pressable
              onPress={() => router.push(editHref(id) as never)}
              hitSlop={12}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Pencil color={colors.primary} size={22} strokeWidth={2} />
            </Pressable>
          ) : null}
          {remove ? (
            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              hitSlop={12}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Trash color={colors.destructive} size={22} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      ),
    })
  }, [
    navigation,
    remove,
    editHref,
    item,
    deleting,
    handleDelete,
    title,
    colors.primary,
    colors.destructive,
    router,
    id,
  ])

  const handleCopy = async (value: string) => {
    await Clipboard.setStringAsync(value)
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleCall = (value: string) => {
    void Linking.openURL(`tel:${value}`)
  }

  if (loading && !item) {
    return (
      <View style={styles.centered}>
        <AppLoader message="Loading record" compact />
      </View>
    )
  }

  const chipItems = item ? (chips?.(item) ?? []) : []
  const detailSections = item ? sections(item) : []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <ApiErrorBanner
          message={error}
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      ) : null}

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Record</Text>
        <Text style={styles.title}>{item ? title(item) : "—"}</Text>
        {statusOptions?.length && item && onStatusChange ? (
          <StatusPicker
            label="Status"
            value={getStatus?.(item) ?? null}
            options={statusOptions}
            onChange={async (status) => {
              const updated = await onStatusChange(id, status)
              setItem(updated)
            }}
          />
        ) : null}
        {chipItems.length > 0 ? (
          <View style={styles.chips}>
            {chipItems.map((chip) => (
              <StatusChip
                key={chip.label}
                label={chip.label}
                variant={chip.variant}
              />
            ))}
          </View>
        ) : null}
      </View>

      {item ? (
        detailSections.map((section) => (
          <GroupedSection key={section.title} title={section.title}>
            <View style={styles.fieldList}>
              {section.fields.map((field, index) => {
                const value = field.value || "—"
                const hasCopy = field.copyable && field.value
                const hasCall = field.callable && field.value

                return (
                  <View key={field.label}>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.fieldValue}>{value}</Text>
                      {hasCopy || hasCall ? (
                        <View style={styles.fieldActions}>
                          {hasCopy ? (
                            <Pressable
                              onPress={() => void handleCopy(field.value!)}
                              style={styles.actionButton}
                            >
                              <Text style={styles.actionText}>Copy</Text>
                            </Pressable>
                          ) : null}
                          {hasCall ? (
                            <Pressable
                              onPress={() => handleCall(field.value!)}
                              style={styles.actionButton}
                            >
                              <Text style={styles.actionText}>Call</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                    {index < section.fields.length - 1 ? (
                      <View style={styles.fieldSeparator} />
                    ) : null}
                  </View>
                )
              })}
            </View>
          </GroupedSection>
        ))
      ) : (
        <GroupedSection title="Details">
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Record details are unavailable right now.
            </Text>
          </View>
        </GroupedSection>
      )}
    </ScrollView>
  )
}

export function detailValue(value: unknown): string {
  if (value == null) return "—"
  if (Array.isArray(value)) return value.map(formatLabel).join(", ") || "—"
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDateTime(value)
    return formatLabel(value)
  }
  return String(value)
}
