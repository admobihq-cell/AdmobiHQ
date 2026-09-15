import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  ADVERTISER_PERMISSIONS,
  type AdvertiserPermission,
  type AdvertiserRoleDto,
} from "@workspace/ops-contracts"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { createOrgRole, deleteOrgRole, listOrgRoles, updateOrgRole } from "@/lib/org-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"
import { useOrgPermissions } from "@/lib/use-org"

const ROLES_KEY = ["customer-org-roles"] as const

const PERMISSION_LABELS: Record<AdvertiserPermission, string> = {
  "campaigns:read": "View campaigns",
  "campaigns:write": "Create and edit campaigns",
  "campaigns:submit": "Submit campaigns",
  "creatives:write": "Upload creative",
  "reports:read": "View reports",
  "billing:read": "View billing",
  "billing:write": "Change billing",
  "team:manage": "Manage the team",
  "org:manage": "Rename the organization",
  "activity:read": "View activity",
  "support:read_all": "See all support cases",
}

export default function RolesSettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const getToken = useTokenGetter()
  const queryClient = useQueryClient()
  const { isOwner } = useOrgPermissions()

  const [edits, setEdits] = useState<Record<number, AdvertiserPermission[]>>({})
  const [newRoleName, setNewRoleName] = useState("")

  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => listOrgRoles(getToken),
    retry: false,
  })

  async function refresh() {
    setEdits({})
    await queryClient.invalidateQueries({ queryKey: ROLES_KEY })
    await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
    // Editing a role can change the caller's own permissions.
    await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
  }

  const saveMutation = useMutation({
    mutationFn: (role: AdvertiserRoleDto) =>
      updateOrgRole(getToken, role.id, { permissions: edits[role.id] ?? role.permissions }),
    onSuccess: async (_result, role) => {
      // Saving a shared starter clones it for this org; starters stay global.
      Alert.alert("Saved", role.isStarter ? `Customized "${role.name}" for your organization` : "Role updated")
      await refresh()
    },
    onError: (err: Error) => Alert.alert("Couldn't save", err.message),
  })

  const createMutation = useMutation({
    mutationFn: () => createOrgRole(getToken, { name: newRoleName.trim(), permissions: [] }),
    onSuccess: async () => {
      setNewRoleName("")
      await refresh()
    },
    onError: (err: Error) => Alert.alert("Couldn't create", err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (role: AdvertiserRoleDto) => deleteOrgRole(getToken, role.id),
    onSuccess: refresh,
    onError: (err: Error) => Alert.alert("Couldn't delete", err.message),
  })

  function permissionsFor(role: AdvertiserRoleDto): AdvertiserPermission[] {
    return edits[role.id] ?? role.permissions
  }

  function toggle(role: AdvertiserRoleDto, permission: AdvertiserPermission) {
    const current = permissionsFor(role)
    const next = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission]
    setEdits((prev) => ({ ...prev, [role.id]: next }))
  }

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: { ...typography.body, fontWeight: "700" as const, color: c.text },
    hint: { ...typography.caption, color: c.mutedForeground },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: c.text,
    },
    permRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 6,
    },
    permLabel: { ...typography.body, color: c.text, flex: 1 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    checkMark: { color: c.primaryForeground, fontWeight: "700" as const },
    button: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: 10,
      alignItems: "center" as const,
      backgroundColor: c.primary,
    },
    buttonText: { fontWeight: "700" as const, color: c.primaryForeground },
    danger: { color: c.destructive, fontWeight: "600" as const },
  }))

  if (rolesQuery.isLoading) {
    return (
      <View style={[styles.scroll, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!isOwner) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Roles</Text>
          <Text style={styles.hint}>Only the organization admin can change roles.</Text>
        </View>
      </ScrollView>
    )
  }

  const roles = rolesQuery.data ?? []

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      {roles.map((role) => {
        const selected = permissionsFor(role)
        const dirty =
          selected.length !== role.permissions.length ||
          selected.some((p) => !role.permissions.includes(p))

        return (
          <View key={role.id} style={styles.card}>
            <Text style={styles.title}>{role.name}</Text>
            <Text style={styles.hint}>
              {role.isStarter
                ? "Shared starter — saving creates your own copy."
                : `${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`}
            </Text>

            {ADVERTISER_PERMISSIONS.map((permission) => {
              const on = selected.includes(permission)
              return (
                <Pressable
                  key={permission}
                  style={styles.permRow}
                  onPress={() => toggle(role, permission)}
                >
                  <Text style={styles.permLabel}>{PERMISSION_LABELS[permission]}</Text>
                  <View style={[styles.checkbox, on && styles.checkboxOn]}>
                    {on ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </Pressable>
              )
            })}

            {dirty ? (
              <Pressable
                style={styles.button}
                disabled={saveMutation.isPending}
                onPress={() => saveMutation.mutate(role)}
              >
                <Text style={styles.buttonText}>
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </Text>
              </Pressable>
            ) : null}

            {!role.isStarter ? (
              <Pressable
                onPress={() =>
                  Alert.alert("Delete role?", `"${role.name}" will be removed.`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteMutation.mutate(role),
                    },
                  ])
                }
              >
                <Text style={styles.danger}>Delete role</Text>
              </Pressable>
            ) : null}
          </View>
        )
      })}

      <View style={styles.card}>
        <Text style={styles.title}>New role</Text>
        <TextInput
          style={styles.input}
          value={newRoleName}
          onChangeText={setNewRoleName}
          placeholder="Media buyer"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={styles.hint}>Created with no permissions — add them above once it exists.</Text>
        <Pressable
          style={styles.button}
          disabled={!newRoleName.trim() || createMutation.isPending}
          onPress={() => createMutation.mutate()}
        >
          <Text style={styles.buttonText}>
            {createMutation.isPending ? "Creating…" : "Create role"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
