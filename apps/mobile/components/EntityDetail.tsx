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

import { AppLoader } from "@/components/app/app-loader"
import { GroupedSection } from "@/components/app/grouped-list"
import { StatusChip } from "@/components/app/status-chip"
import { Trash } from "@/components/icons"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { colors, spacing, typography } from "@/lib/theme"

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
}

export function EntityDetail<T>({
  load,
  remove,
  title,
  chips,
  sections,
}: EntityDetailProps<T>) {
  const router = useRouter()
  const navigation = useNavigation()
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
    try {
      setItem(await load(id))
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setLoading(false)
    }
  }, [id, load])

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
      headerRight: remove
        ? () => (
            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              hitSlop={12}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Trash color={colors.destructive} size={22} strokeWidth={2} />
            </Pressable>
          )
        : undefined,
    })
  }, [navigation, remove, item, deleting, handleDelete, title])

  const handleCopy = async (value: string) => {
    await Clipboard.setStringAsync(value)
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleCall = (value: string) => {
    void Linking.openURL(`tel:${value}`)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <AppLoader message="Loading record" compact />
      </View>
    )
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Not found"}</Text>
      </View>
    )
  }

  const chipItems = chips?.(item) ?? []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Record</Text>
        <Text style={styles.title}>{title(item)}</Text>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {sections(item).map((section) => (
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
      ))}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  heroCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fieldList: {
    overflow: "hidden",
  },
  fieldSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "500",
  },
  fieldActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    ...typography.bodySm,
  },
})
