import { useState } from "react"
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { useAuth } from "@clerk/clerk-expo"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDateTime } from "@workspace/ops-contracts"
import type {
  NotYetInvitedDto,
  TeamInvitationDto,
  TeamMemberDto,
  TeamRoleUpdateInput,
} from "@workspace/ops-contracts"

import { GroupedList } from "@/components/app/grouped-list"
import { ListRow } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import { StatusChip } from "@/components/app/status-chip"
import { Plus, Trash, Users } from "@/components/icons"
import { InviteSheet } from "@/components/team/invite-sheet"
import { TeamTabs } from "@/components/team/team-tabs"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { BottomSheetPicker, type BottomSheetPickerOption } from "@/components/ui/bottom-sheet-picker"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const ADMIN_VALUE = "admin"
const memberValue = (roleId: number) => `member:${roleId}`

function decodeTier(value: string): TeamRoleUpdateInput | null {
  if (value === ADMIN_VALUE) return { tier: "admin" }
  const roleId = Number(value.slice("member:".length))
  return Number.isFinite(roleId) ? { tier: "member", roleId } : null
}

export default function TeamMembersScreen() {
  usePageHeader("Team")
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const colors = useThemeColors()
  const { userId: currentUserId } = useAuth()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [prefillEmail, setPrefillEmail] = useState("")
  const [rolePickerMember, setRolePickerMember] = useState<TeamMemberDto | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null)

  const teamQuery = useQuery({ queryKey: ["team"], queryFn: () => client.team.list() })
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => client.roles.list() })
  const team = teamQuery.data ?? null
  const roles = rolesQuery.data?.items ?? []

  const invalidateTeam = () => void queryClient.invalidateQueries({ queryKey: ["team"] })

  const inviteMutation = useMutation({
    mutationFn: (input: { email: string } & TeamRoleUpdateInput) => client.team.invite(input),
    onSuccess: () => {
      invalidateTeam()
      setInviteOpen(false)
      setPrefillEmail("")
    },
    onError: (err) => Alert.alert("Couldn't invite", formatOpsError(err, API_URL)),
  })

  const roleMutation = useMutation({
    mutationFn: ({ member, input }: { member: TeamMemberDto; input: TeamRoleUpdateInput }) =>
      client.team.updateRole(member.userId, input),
    onSuccess: () => {
      invalidateTeam()
      setRolePickerMember(null)
    },
    onError: (err) => Alert.alert("Couldn't update role", formatOpsError(err, API_URL)),
  })

  const removeMutation = useMutation({
    mutationFn: (member: TeamMemberDto) => client.team.removeMember(member.userId),
    onSuccess: () => {
      invalidateTeam()
      setRemoveTarget(null)
    },
    onError: (err) => Alert.alert("Couldn't remove member", formatOpsError(err, API_URL)),
  })

  const revokeMutation = useMutation({
    mutationFn: (invitation: TeamInvitationDto) => client.team.revokeInvitation(invitation.id),
    onSuccess: invalidateTeam,
    onError: (err) => Alert.alert("Couldn't revoke invitation", formatOpsError(err, API_URL)),
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
    sectionLabel: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    sectionHint: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    rowActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    revokeText: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.destructive,
    },
    addText: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.primary,
    },
  }))

  const error =
    teamQuery.error || rolesQuery.error
      ? formatOpsError(teamQuery.error ?? rolesQuery.error, API_URL)
      : null
  const loading = teamQuery.isPending || rolesQuery.isPending

  const rolePickerOptions: BottomSheetPickerOption[] = [
    { value: ADMIN_VALUE, label: "Admin" },
    ...roles.map((role) => ({ value: memberValue(role.id), label: role.name })),
  ]

  function memberValueOf(member: TeamMemberDto): string {
    if (member.role === "admin") return ADMIN_VALUE
    return member.roleId ? memberValue(member.roleId) : ""
  }

  function openInvite(email = "") {
    setPrefillEmail(email)
    setInviteOpen(true)
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={teamQuery.isRefetching || rolesQuery.isRefetching}
            onRefresh={() => {
              void teamQuery.refetch()
              void rolesQuery.refetch()
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <PageHero
          icon={Users}
          title="Team"
          description="Manage who has access to the console."
          trailing={
            <Pressable
              style={styles.addButton}
              onPress={() => openInvite()}
              accessibilityLabel="Invite someone"
            >
              <Plus color={colors.primaryForeground} size={22} strokeWidth={2.5} />
            </Pressable>
          }
        />
        <TeamTabs active="members" />

        {error ? <ApiErrorBanner message={error} onRetry={() => void teamQuery.refetch()} /> : null}

        {loading ? (
          <SkeletonListRows count={4} />
        ) : team ? (
          <>
            <View>
              <Text style={styles.sectionLabel}>Members</Text>
              {team.members.length === 0 ? (
                <EmptyState icon={Users} title="No members yet" />
              ) : (
                <GroupedList>
                  {team.members.map((member) => {
                    const isSelf = member.userId === currentUserId
                    const locked = member.role === "admin"
                    const roleLabel = locked ? "Admin" : (member.roleName ?? "No role")
                    const notes = [
                      formatDateTime(member.joinedAt),
                      isSelf ? "You" : null,
                      member.role === "member" && !member.roleId ? "No role assigned yet" : null,
                    ].filter(Boolean)
                    return (
                      <ListRow
                        key={member.userId}
                        title={member.email}
                        subtitle={notes.join(" · ")}
                        initials={member.email}
                        rightElement={
                          <View style={styles.rowActions}>
                            <Pressable
                              disabled={locked}
                              onPress={() => setRolePickerMember(member)}
                              accessibilityLabel={`Change role for ${member.email}`}
                            >
                              <StatusChip
                                label={roleLabel}
                                variant={locked ? "muted" : "primary"}
                              />
                            </Pressable>
                            {!locked ? (
                              <Pressable
                                onPress={() => setRemoveTarget(member)}
                                hitSlop={8}
                                accessibilityLabel={`Remove ${member.email}`}
                              >
                                <Trash size={18} color={colors.mutedForeground} />
                              </Pressable>
                            ) : null}
                          </View>
                        }
                      />
                    )
                  })}
                </GroupedList>
              )}
            </View>

            {team.invitations.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>Pending invitations</Text>
                <GroupedList>
                  {team.invitations.map((invitation) => (
                    <ListRow
                      key={invitation.id}
                      title={invitation.email}
                      subtitle={formatDateTime(invitation.createdAt)}
                      rightElement={
                        <View style={styles.rowActions}>
                          <StatusChip
                            label={invitation.role === "admin" ? "Admin" : "Member"}
                            variant="muted"
                          />
                          <Pressable
                            onPress={() => revokeMutation.mutate(invitation)}
                            disabled={
                              revokeMutation.isPending &&
                              revokeMutation.variables?.id === invitation.id
                            }
                          >
                            <Text style={styles.revokeText}>Revoke</Text>
                          </Pressable>
                        </View>
                      }
                    />
                  ))}
                </GroupedList>
              </View>
            ) : null}

            {team.notYetInvited.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>Not yet on the team</Text>
                <Text style={styles.sectionHint}>
                  These people already have an Admobi account but haven&apos;t been added to
                  the console.
                </Text>
                <GroupedList>
                  {team.notYetInvited.map((candidate: NotYetInvitedDto) => (
                    <ListRow
                      key={candidate.userId}
                      title={candidate.email}
                      rightElement={
                        <Pressable onPress={() => openInvite(candidate.email)}>
                          <Text style={styles.addText}>Add</Text>
                        </Pressable>
                      }
                    />
                  ))}
                </GroupedList>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <InviteSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roles={roles}
        initialEmail={prefillEmail}
        submitting={inviteMutation.isPending}
        onSubmit={(input) => inviteMutation.mutate(input)}
      />

      <BottomSheetPicker
        visible={rolePickerMember !== null}
        onClose={() => setRolePickerMember(null)}
        title={rolePickerMember ? `Role for ${rolePickerMember.email}` : undefined}
        options={rolePickerOptions}
        value={rolePickerMember ? memberValueOf(rolePickerMember) : ""}
        onSelect={(value) => {
          if (!rolePickerMember) return
          const decoded = decodeTier(value)
          if (decoded) roleMutation.mutate({ member: rolePickerMember, input: decoded })
        }}
      />

      <ConfirmDialog
        visible={removeTarget !== null}
        title={`Remove ${removeTarget?.email}?`}
        message="They'll immediately lose access to the ops console. You can re-invite them later."
        confirmLabel="Remove"
        destructive
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
    </View>
  )
}
