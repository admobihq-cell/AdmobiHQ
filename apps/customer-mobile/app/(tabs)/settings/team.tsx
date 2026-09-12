import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as WebBrowser from "expo-web-browser"

import { Person } from "@/components/icons"
import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { EXPO_PUBLIC_APP_URL } from "@/lib/env"
import {
  getOrg,
  inviteOrgMember,
  listOrgMembers,
  listOrgRoles,
  removeOrgMember,
  renameOrg,
  revokeOrgInvitation,
  transferOrgOwnership,
} from "@/lib/org-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const ORG_KEY = ["customer-org"] as const
const MEMBERS_KEY = ["customer-org-members"] as const
const ROLES_KEY = ["customer-org-roles"] as const

export default function TeamSettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const getToken = useTokenGetter()
  const queryClient = useQueryClient()
  const [orgName, setOrgName] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)

  const orgQuery = useQuery({
    queryKey: ORG_KEY,
    queryFn: () => getOrg(getToken),
  })
  const membersQuery = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () => listOrgMembers(getToken),
    retry: false,
  })
  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => listOrgRoles(getToken),
    enabled: membersQuery.isSuccess,
    retry: false,
  })

  const canManage = membersQuery.isSuccess
  const displayName = orgName ?? orgQuery.data?.name ?? ""
  const roles = rolesQuery.data ?? []
  const activeRoleId =
    selectedRoleId ?? roles.find((r) => r.name === "Member")?.id ?? roles[0]?.id ?? null

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameOrg(getToken, { name }),
    onSuccess: async (org) => {
      setOrgName(org.name)
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
      Alert.alert("Saved", "Organization name updated.")
    },
    onError: (err: Error) => Alert.alert("Couldn't save", err.message),
  })

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (!activeRoleId) throw new Error("Pick a role")
      return inviteOrgMember(getToken, { email: email.trim(), roleId: activeRoleId })
    },
    onSuccess: async () => {
      setEmail("")
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      Alert.alert("Invitation sent", "They'll get an email with a link to join.")
    },
    onError: (err: Error) => Alert.alert("Couldn't invite", err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: number) => removeOrgMember(getToken, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
    },
    onError: (err: Error) => Alert.alert("Couldn't remove", err.message),
  })

  const transferMutation = useMutation({
    mutationFn: (memberId: number) => transferOrgOwnership(getToken, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
      Alert.alert("Admin transferred")
    },
    onError: (err: Error) => Alert.alert("Couldn't transfer", err.message),
  })

  const revokeMutation = useMutation({
    mutationFn: (invitationId: number) => revokeOrgInvitation(getToken, invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
    },
    onError: (err: Error) => Alert.alert("Couldn't revoke", err.message),
  })

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing.lg,
      gap: spacing.md,
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
      backgroundColor: c.bg,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: spacing.sm,
      alignItems: "center" as const,
    },
    buttonText: { color: c.primaryForeground, fontWeight: "700" as const },
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowTitle: { ...typography.body, color: c.text, fontWeight: "600" as const },
    rowMeta: { ...typography.caption, color: c.mutedForeground },
    danger: { color: "#b91c1c", fontWeight: "600" as const },
    roleChip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    roleChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    roleChipText: { ...typography.caption, color: c.text },
    roleChipTextActive: { color: c.primaryForeground, fontWeight: "700" as const },
  }))

  if (orgQuery.isLoading) {
    return (
      <View style={[styles.scroll, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Organization</Text>
        <Text style={styles.hint}>Name shown on campaigns and invites.</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setOrgName}
          placeholder="Acme Media"
          placeholderTextColor={colors.mutedForeground}
          editable={canManage}
        />
        {canManage ? (
          <Pressable
            style={styles.button}
            disabled={
              renameMutation.isPending ||
              !displayName.trim() ||
              displayName.trim() === (orgQuery.data?.name ?? "")
            }
            onPress={() => renameMutation.mutate(displayName.trim())}
          >
            <Text style={styles.buttonText}>
              {renameMutation.isPending ? "Saving…" : "Save name"}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>
            Only admins can rename the organization or manage the team.
          </Text>
        )}
      </View>

      {canManage ? (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>Invite teammate</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="colleague@company.com"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {roles.map((role) => {
                const active = role.id === activeRoleId
                return (
                  <Pressable
                    key={role.id}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                    onPress={() => setSelectedRoleId(role.id)}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {role.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Pressable
              style={styles.button}
              disabled={!email.trim() || !activeRoleId || inviteMutation.isPending}
              onPress={() => inviteMutation.mutate()}
            >
              <Text style={styles.buttonText}>
                {inviteMutation.isPending ? "Sending…" : "Send invite"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Members</Text>
            {(membersQuery.data?.members ?? []).map((member) => (
              <View key={member.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {member.name ?? member.email ?? member.clerkUserId}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {member.isOwner ? "Admin" : (member.roleName ?? "Member")}
                    {member.email ? ` · ${member.email}` : ""}
                  </Text>
                </View>
                {!member.isOwner ? (
                  <View style={{ alignItems: "flex-end", gap: 8 }}>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          "Make admin?",
                          "You'll become a regular member. They'll become the admin.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Transfer",
                              onPress: () => transferMutation.mutate(member.id),
                            },
                          ],
                        )
                      }
                    >
                      <Text style={{ color: colors.primary, fontWeight: "600" }}>Make admin</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert("Remove member?", "They'll lose access to this organization.", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => removeMutation.mutate(member.id),
                          },
                        ])
                      }
                    >
                      <Text style={styles.danger}>Remove</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {(membersQuery.data?.invitations.length ?? 0) > 0 ? (
            <View style={styles.card}>
              <Text style={styles.title}>Pending invitations</Text>
              {(membersQuery.data?.invitations ?? []).map((invite) => (
                <View key={invite.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{invite.email}</Text>
                    <Text style={styles.rowMeta}>{invite.roleName ?? "Member"}</Text>
                  </View>
                  <Pressable onPress={() => revokeMutation.mutate(invite.id)}>
                    <Text style={styles.danger}>Revoke</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.card}>
          <Person size={24} color={colors.mutedForeground} />
          <Text style={styles.title}>
            {orgQuery.data?.name || "Your organization"}
          </Text>
          <Text style={styles.hint}>
            {orgQuery.data?.memberCount ?? 1} member
            {(orgQuery.data?.memberCount ?? 1) === 1 ? "" : "s"}. Ask an admin to invite people or
            change roles.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              const base = (EXPO_PUBLIC_APP_URL ?? "https://app.admobihq.com").replace(/\/$/, "")
              void WebBrowser.openBrowserAsync(`${base}/settings/team`)
            }}
          >
            <Text style={styles.buttonText}>Open Team on web</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}
