import { useEffect, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { OPS_PERMISSIONS, type OpsPermission } from "@workspace/ops-contracts"

import { SkeletonFormRecord } from "@/components/app/skeleton"
import { CheckboxOff, CheckboxOn } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DestructiveButton, Field, Label, PrimaryButton } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { PERMISSION_LABELS } from "@/lib/permission-labels"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function EditRoleScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number.parseInt(rawId ?? "", 10)
  const router = useRouter()
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const colors = useThemeColors()

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => client.roles.list() })
  const role = rolesQuery.data?.items.find((r) => r.id === id) ?? null
  usePageHeader(role ? role.name : "Role", { showBack: true, backHref: "/(ops)/team/roles" })

  const [name, setName] = useState("")
  const [permissions, setPermissions] = useState<OpsPermission[]>([])
  const [deleteVisible, setDeleteVisible] = useState(false)

  useEffect(() => {
    if (role) {
      setName(role.name)
      setPermissions(role.permissions)
    }
  }, [role])

  const dirty =
    role !== null &&
    (name !== role.name ||
      permissions.length !== role.permissions.length ||
      permissions.some((p) => !role.permissions.includes(p)))

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!role) throw new Error("Role not loaded")
      return client.roles.update(role.id, { name: name.trim(), permissions })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["roles"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!role) throw new Error("Role not loaded")
      return client.roles.delete(role.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      router.back()
    },
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    checkboxList: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      overflow: "hidden" as const,
    },
    checkboxRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    checkboxRowBorder: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    checkboxLabel: {
      ...typography.body,
      color: c.text,
    },
    deleteHint: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: -spacing.xs,
    },
  }))

  function togglePermission(permission: OpsPermission) {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  if (rolesQuery.isPending) {
    return <SkeletonFormRecord />
  }

  if (!role) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ApiErrorBanner
            message={
              rolesQuery.error ? formatOpsError(rolesQuery.error, API_URL) : "Role not found."
            }
          />
        </View>
      </View>
    )
  }

  const canDelete = role.memberCount === 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHero title={role.name} description="Edit role name and permissions." compact />

      {saveMutation.error ? (
        <ApiErrorBanner message={formatOpsError(saveMutation.error, API_URL)} />
      ) : null}

      <View>
        <Label>Role name</Label>
        <Field value={name} onChangeText={setName} autoCapitalize="words" editable={!saveMutation.isPending} />
      </View>

      <View>
        <Label>Permissions</Label>
        <View style={styles.checkboxList}>
          {OPS_PERMISSIONS.map((permission, index) => {
            const checked = permissions.includes(permission)
            return (
              <Pressable
                key={permission}
                style={[styles.checkboxRow, index > 0 && styles.checkboxRowBorder]}
                onPress={() => togglePermission(permission)}
                disabled={saveMutation.isPending}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                {checked ? (
                  <CheckboxOn size={20} color={colors.primary} />
                ) : (
                  <CheckboxOff size={20} color={colors.mutedForeground} />
                )}
                <Text style={styles.checkboxLabel}>{PERMISSION_LABELS[permission]}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {dirty ? (
        <PrimaryButton
          label={saveMutation.isPending ? "Saving…" : "Save changes"}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
        />
      ) : null}

      <DestructiveButton
        label="Delete role"
        onPress={() => setDeleteVisible(true)}
        disabled={!canDelete || deleteMutation.isPending}
      />
      {!canDelete ? (
        <Text style={styles.deleteHint}>Reassign members before deleting this role.</Text>
      ) : null}

      <ConfirmDialog
        visible={deleteVisible}
        title={`Delete "${role.name}"?`}
        message="This can't be undone. Only roles with no members assigned can be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScrollView>
  )
}
