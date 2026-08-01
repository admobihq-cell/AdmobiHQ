import { useCallback, useLayoutEffect, useState } from "react"
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"
import { formatDateTime, formatLabel } from "@workspace/ops-contracts"
import type { FormFieldOption } from "@workspace/ops-contracts"

import { SkeletonDetailRecord } from "@/components/app/skeleton"
import { GroupedSection } from "@/components/app/grouped-list"
import {
  StatusChip,
  type StatusChipVariant,
} from "@/components/app/status-chip"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Pencil, Trash } from "@/components/icons"
import { StatusPicker } from "@/components/StatusPicker"
import type { EntityKey } from "@/lib/entity-form-config"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { entityKeys } from "@/lib/query-keys"
import {
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

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
  entity: EntityKey
  load: (id: number) => Promise<T>
  remove?: (id: number) => Promise<unknown>
  title: (item: T) => string
  chips?: (
    item: T
  ) => Array<{ label: string; variant?: "default" | "primary" | "muted" }>
  sections: (item: T) => DetailSection[]
  editHref?: (id: number) => string
  statusOptions?: FormFieldOption[]
  onStatusChange?: (id: number, status: string) => Promise<T>
  getStatus?: (item: T) => string | null | undefined
  /** Same semantic color mapping used by the entity's list-row status chip, so status colors match between list and detail. */
  getStatusVariant?: (status: string | null | undefined) => StatusChipVariant
}

export function EntityDetail<T>({
  entity,
  load,
  remove,
  title,
  chips,
  sections,
  editHref,
  statusOptions,
  onStatusChange,
  getStatus,
  getStatusVariant,
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
  const validId = Number.isFinite(id) && id > 0
  const queryClient = useQueryClient()
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false)

  const itemQuery = useQuery({
    queryKey: entityKeys.detail(entity, id),
    queryFn: () => load(id),
    enabled: validId,
  })
  const item = itemQuery.data ?? null
  const loading = validId ? itemQuery.isPending : false

  const statusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!onStatusChange) throw new Error("onStatusChange not configured")
      return onStatusChange(id, status)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(entityKeys.detail(entity, id), updated)
      void queryClient.invalidateQueries({ queryKey: entityKeys.all(entity) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!remove) throw new Error("remove not configured")
      return remove(id)
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: entityKeys.detail(entity, id) })
      void queryClient.invalidateQueries({ queryKey: entityKeys.all(entity) })
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      router.back()
    },
  })

  const error = validId
    ? itemQuery.error
      ? formatOpsError(itemQuery.error, API_URL)
      : deleteMutation.error
        ? formatOpsError(deleteMutation.error, API_URL)
        : null
    : "Invalid record id"
  const activeError = error && error !== dismissedError ? error : null

  const handleRetry = () => {
    setDismissedError(null)
    void itemQuery.refetch()
  }

  const handleDelete = useCallback(() => {
    if (!remove || !item) return
    setConfirmDeleteVisible(true)
  }, [remove, item])

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
              disabled={deleteMutation.isPending}
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
    deleteMutation.isPending,
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
    return <SkeletonDetailRecord />
  }

  const chipItems = item ? (chips?.(item) ?? []) : []
  const detailSections = item ? sections(item) : []

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {activeError ? (
          <ApiErrorBanner
            message={activeError}
            onRetry={handleRetry}
            onDismiss={() => setDismissedError(activeError)}
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
              onChange={(status) => statusMutation.mutate(status)}
              getVariant={getStatusVariant}
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
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete record"
        message="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmDeleteVisible(false)
          deleteMutation.mutate()
        }}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </>
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
