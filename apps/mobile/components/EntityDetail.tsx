import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { formatDateTime, formatLabel } from "@workspace/ops-contracts"

import { DestructiveButton } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { OPS_URL } from "@/lib/ops-client"
import { colors, radius, spacing, typography } from "@/lib/theme"

type DetailField = {
  label: string
  value: string | null | undefined
}

type EntityDetailProps<T> = {
  load: (id: number) => Promise<T>
  remove?: (id: number) => Promise<unknown>
  title: (item: T) => string
  fields: (item: T) => DetailField[]
}

export function EntityDetail<T>({
  load,
  remove,
  title,
  fields,
}: EntityDetailProps<T>) {
  const router = useRouter()
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
      setError(formatOpsError(err, OPS_URL))
    } finally {
      setLoading(false)
    }
  }, [id, load])

  useEffect(() => {
    void fetchItem()
  }, [fetchItem])

  const handleDelete = async () => {
    if (!remove || !item) return
    setDeleting(true)
    try {
      await remove(id)
      router.back()
    } catch (err) {
      setError(formatOpsError(err, OPS_URL))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title(item)}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.fieldList}>
        {fields(item).map((field, index, allFields) => (
          <View
            key={field.label}
            style={[
              styles.row,
              index < allFields.length - 1 && styles.rowBorder,
            ]}
          >
            <Text style={styles.label}>{field.label}</Text>
            <Text style={styles.value}>{field.value || "—"}</Text>
          </View>
        ))}
      </View>
      {remove ? (
        <DestructiveButton
          label={deleting ? "Deleting…" : "Delete record"}
          onPress={() => void handleDelete()}
          disabled={deleting}
        />
      ) : null}
    </ScrollView>
  )
}

export function detailValue(value: unknown): string {
  if (value == null) return "—"
  if (Array.isArray(value)) return value.join(", ") || "—"
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
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  fieldList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.label,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    ...typography.bodySm,
  },
})
