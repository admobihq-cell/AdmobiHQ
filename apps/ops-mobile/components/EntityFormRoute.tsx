import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"

import { AppLoader } from "@/components/app/app-loader"
import { EntityFormScreen } from "@/components/EntityFormScreen"
import { getEntityFormConfig, type EntityKey } from "@/lib/entity-form-config"
import { formatOpsError } from "@/lib/format-error"
import { useOpsClient, API_URL } from "@/lib/ops-client"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

type EntityFormRouteProps = {
  entity: EntityKey
  mode: "create" | "edit"
}

export function EntityFormRoute({ entity, mode }: EntityFormRouteProps) {
  const router = useRouter()
  const client = useOpsClient()
  const config = getEntityFormConfig(entity)
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number.parseInt(rawId ?? "", 10)
  const [initialValues, setInitialValues] = useState<Record<string, string> | null>(
    mode === "create" ? (config?.defaultValues ?? {}) : null,
  )
  const [loading, setLoading] = useState(mode === "edit")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const styles = useThemedStyles((c) => ({
    centered: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
      padding: spacing.lg,
    },
    errorTitle: {
      ...typography.section,
      color: c.text,
      marginBottom: spacing.xs,
    },
    errorBody: {
      ...typography.body,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
  }))

  useEffect(() => {
    if (mode !== "edit" || !config) return
    if (!Number.isFinite(id) || id <= 0) {
      setError("Invalid record id")
      setLoading(false)
      return
    }

    void (async () => {
      try {
        const record = await config.get(client, id)
        setInitialValues(config.fromRecord(record as never))
      } catch (err) {
        setError(formatOpsError(err, API_URL))
      } finally {
        setLoading(false)
      }
    })()
  }, [mode, config, client, id])

  if (!config) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Screen not found</Text>
        <Text style={styles.errorBody}>
          {`"${entity}" isn't a recognized record type. Go back and try again.`}
        </Text>
      </View>
    )
  }

  if (loading || initialValues == null) {
    return (
      <View style={styles.centered}>
        <AppLoader message={`Loading ${config.singular.toLowerCase()}`} compact />
      </View>
    )
  }

  const handleSubmit = async (values: Record<string, string>) => {
    setSaving(true)
    setError(null)

    const payload = config.toPayload(values)
    const validationError =
      mode === "create"
        ? config.validateCreate(payload)
        : config.validateUpdate(payload)

    if (validationError) {
      setError(validationError)
      setSaving(false)
      return
    }

    try {
      if (mode === "create") {
        await config.create(client, payload)
      } else {
        await config.update(client, id, payload)
      }
      router.back()
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setSaving(false)
    }
  }

  return (
    <EntityFormScreen
      title={mode === "create" ? `Add ${config.singular.toLowerCase()}` : `Edit ${config.singular.toLowerCase()}`}
      fields={config.fields}
      initialValues={initialValues}
      submitLabel={mode === "create" ? "Create" : "Save changes"}
      saving={saving}
      error={error}
      onDismissError={() => setError(null)}
      onSubmit={handleSubmit}
    />
  )
}
