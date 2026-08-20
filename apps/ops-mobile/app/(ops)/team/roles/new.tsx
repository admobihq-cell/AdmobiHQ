import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { OPS_PERMISSIONS, type OpsPermission } from "@workspace/ops-contracts"

import { CheckboxOff, CheckboxOn } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { Field, Label, PrimaryButton } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { PERMISSION_LABELS } from "@/lib/permission-labels"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function NewRoleScreen() {
  usePageHeader("Add role", { showBack: true, backHref: "/(ops)/team/roles" })
  const router = useRouter()
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const colors = useThemeColors()

  const [name, setName] = useState("")
  const [permissions, setPermissions] = useState<OpsPermission[]>([])

  const createMutation = useMutation({
    mutationFn: () => client.roles.create({ name: name.trim(), permissions }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      router.back()
    },
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    hint: {
      ...typography.bodySm,
      color: c.mutedForeground,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
    },
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
  }))

  function togglePermission(permission: OpsPermission) {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHero title="Add role" description="Name the role and choose which sections its members can access." compact />

      {createMutation.error ? (
        <ApiErrorBanner message={formatOpsError(createMutation.error, API_URL)} />
      ) : null}

      <View>
        <Label>Role name</Label>
        <Field
          value={name}
          onChangeText={setName}
          placeholder="e.g. Support Lead"
          autoCapitalize="words"
          editable={!createMutation.isPending}
        />
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
                disabled={createMutation.isPending}
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

      <PrimaryButton
        label={createMutation.isPending ? "Creating…" : "Create role"}
        onPress={() => createMutation.mutate()}
        disabled={createMutation.isPending || !name.trim()}
      />
    </ScrollView>
  )
}
