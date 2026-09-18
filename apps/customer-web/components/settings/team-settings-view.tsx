"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageSquareText, UserPlus } from "lucide-react"
import { toast } from "sonner"

import type { AdvertiserInviteInput, AdvertiserMemberDto } from "@workspace/ops-contracts"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import {
  getOrg,
  inviteOrgMember,
  listAdminRequests,
  listOrgMembers,
  listOrgRoles,
  removeOrgMember,
  renameOrg,
  revokeOrgInvitation,
  transferOrgOwnership,
  updateOrgMember,
} from "@/lib/org-client"
import { orgCan, type AdvertiserAdminRequestDto } from "@workspace/ops-contracts"
import { ADMIN_REQUESTS_KEY, AdminRequestsCard } from "@/components/settings/admin-requests-card"
import { OrgBillingCard } from "@/components/settings/org-billing-card"
import { TeamSettingsSkeleton } from "@/components/skeletons/team-settings-skeleton"

const ORG_KEY = ["customer-org"] as const
const MEMBERS_KEY = ["customer-org-members"] as const
const ROLES_KEY = ["customer-org-roles"] as const

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function TeamSettingsView() {
  const { getToken, isLoaded, userId } = useAuth()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState<string>("")
  const [orgName, setOrgName] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<AdvertiserMemberDto | null>(null)
  const [transferTarget, setTransferTarget] = useState<AdvertiserMemberDto | null>(null)
  const [historyTarget, setHistoryTarget] = useState<AdvertiserAdminRequestDto | null>(null)

  const orgQuery = useQuery({
    queryKey: ORG_KEY,
    queryFn: () => getOrg(getToken),
    enabled: isLoaded,
  })

  // Gate on the permission the server enforces, not on whether the members
  // request happened to succeed — a network blip must not read as "demoted".
  const canManageTeam = orgCan(orgQuery.data, "team:manage")
  const canRenameOrg = orgCan(orgQuery.data, "org:manage")

  const membersQuery = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () => listOrgMembers(getToken),
    enabled: isLoaded && canManageTeam,
    retry: false,
  })

  // Same query AdminRequestsCard runs — shares its cache entry so this adds
  // no extra request. Once a request is reviewed it drops out of that card
  // entirely, so this is what keeps the requester's reason from vanishing:
  // a small icon on their row that reopens it.
  const adminRequestsQuery = useQuery({
    queryKey: ADMIN_REQUESTS_KEY,
    queryFn: () => listAdminRequests(getToken),
    enabled: isLoaded && canManageTeam,
    retry: false,
  })
  const latestRequestByMember = useMemo(() => {
    const byMember = new Map<string, AdvertiserAdminRequestDto>()
    for (const request of adminRequestsQuery.data ?? []) {
      // Pending requests already have their own visible card above with
      // action buttons — this icon is only for the ones that vanished.
      if (request.status === "pending") continue
      const current = byMember.get(request.clerkUserId)
      if (!current || new Date(request.createdAt) > new Date(current.createdAt)) {
        byMember.set(request.clerkUserId, request)
      }
    }
    return byMember
  }, [adminRequestsQuery.data])

  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => listOrgRoles(getToken),
    enabled: isLoaded && canManageTeam,
    retry: false,
  })

  const displayName = orgName ?? orgQuery.data?.name ?? ""

  const inviteMutation = useMutation({
    mutationFn: (input: AdvertiserInviteInput) => inviteOrgMember(getToken, input),
    onSuccess: async () => {
      toast.success("Invitation sent")
      setInviteOpen(false)
      setEmail("")
      setRoleId("")
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameOrg(getToken, { name }),
    onSuccess: async (org) => {
      setOrgName(org.name)
      toast.success("Organization name updated")
      window.dispatchEvent(
        new CustomEvent("customer-org-named", { detail: { name: org.name } }),
      )
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: number) => removeOrgMember(getToken, memberId),
    onSuccess: async () => {
      toast.success("Member removed")
      setRemoveTarget(null)
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const revokeMutation = useMutation({
    mutationFn: (invitationId: number) => revokeOrgInvitation(getToken, invitationId),
    onSuccess: async () => {
      toast.success("Invitation revoked")
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Re-inviting the same email refreshes the token/expiry and re-sends the
  // email — POST /v1/customer/org/members already does this in place rather
  // than erroring on the org_id+email unique constraint.
  const resendMutation = useMutation({
    mutationFn: (input: AdvertiserInviteInput) => inviteOrgMember(getToken, input),
    onSuccess: async () => {
      toast.success("Invitation resent")
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const roleChangeMutation = useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: number; roleId: number }) =>
      updateOrgMember(getToken, memberId, { roleId, isOwner: false }),
    onSuccess: async () => {
      toast.success("Role updated")
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      // Changing your own role changes what the UI may show you.
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const transferMutation = useMutation({
    mutationFn: (memberId: number) => transferOrgOwnership(getToken, memberId),
    onSuccess: async () => {
      toast.success("Ownership transferred")
      setTransferTarget(null)
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      await queryClient.invalidateQueries({ queryKey: ORG_KEY })
      await queryClient.invalidateQueries({ queryKey: ["customer-org-deletion-status"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const roles = rolesQuery.data ?? []
  const defaultRoleId = useMemo(() => {
    const member = roles.find((r) => r.name === "Member")
    return member ? String(member.id) : roles[0] ? String(roles[0].id) : ""
  }, [roles])

  if (!isLoaded || orgQuery.isLoading || (canManageTeam && membersQuery.isLoading)) {
    return <TeamSettingsSkeleton />
  }

  if (orgQuery.isError) {
    return <p className="text-sm text-destructive">{(orgQuery.error as Error).message}</p>
  }

  if (!canManageTeam) {
    const org = orgQuery.data
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-3 p-6">
            <div>
              <h2 className="text-lg font-medium">{org?.name || "Your organization"}</h2>
              <p className="text-sm text-muted-foreground">
                {org?.memberCount ?? 1} member{org?.memberCount === 1 ? "" : "s"} · you&apos;re a{" "}
                {org?.myRoleName ?? "Member"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Only organization admins can invite people or change roles.
            </p>
          </CardContent>
        </Card>
        <AdminRequestsCard canReview={false} />
      </div>
    )
  }

  const members = membersQuery.data?.members ?? []
  const invitations = membersQuery.data?.invitations ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-medium">Organization</h2>
            <p className="text-sm text-muted-foreground">
              Name shown on campaigns and invites. Only admins can change it.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={displayName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Media"
                disabled={!canRenameOrg}
              />
            </div>
            {canRenameOrg ? (
              <Button
                disabled={
                  renameMutation.isPending ||
                  !displayName.trim() ||
                  displayName.trim() === (orgQuery.data?.name ?? "")
                }
                loading={renameMutation.isPending}
                onClick={() => renameMutation.mutate(displayName.trim())}
              >
                Save name
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <OrgBillingCard org={orgQuery.data} />

      <AdminRequestsCard canReview={canManageTeam} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Members</h2>
              <p className="text-sm text-muted-foreground">People who can work on your campaigns.</p>
            </div>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="size-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a teammate</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select
                      value={roleId || defaultRoleId}
                      onValueChange={setRoleId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={!email.trim() || !(roleId || defaultRoleId) || inviteMutation.isPending}
                    loading={inviteMutation.isPending}
                    onClick={() =>
                      inviteMutation.mutate({
                        email: email.trim(),
                        roleId: Number(roleId || defaultRoleId),
                      })
                    }
                  >
                    Send invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const displayName = member.name ?? member.email ?? member.clerkUserId
                const isSelf = Boolean(userId) && member.clerkUserId === userId
                const request = latestRequestByMember.get(member.clerkUserId)
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm" className="rounded-lg">
                          <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">
                            {displayName}
                            {isSelf ? (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                You
                              </span>
                            ) : null}
                            {request ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-foreground"
                                title="View their admin request"
                                onClick={() => setHistoryTarget(request)}
                              >
                                <MessageSquareText className="size-3.5" aria-hidden />
                                <span className="sr-only">View their admin request</span>
                              </Button>
                            ) : null}
                          </div>
                          {member.email ? (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.isOwner ? (
                        <Badge variant="default">Owner</Badge>
                      ) : (
                        <Select
                          value={member.roleId != null ? String(member.roleId) : undefined}
                          onValueChange={(value) =>
                            roleChangeMutation.mutate({ memberId: member.id, roleId: Number(value) })
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={String(role.id)}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!member.isOwner ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={transferMutation.isPending}
                            onClick={() => setTransferTarget(member)}
                          >
                            Make owner
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={removeMutation.isPending}
                            onClick={() => setRemoveTarget(member)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {invitations.length > 0 ? (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium">Invitations</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invite</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => {
                    const declined = invite.status === "declined"
                    return (
                      <TableRow key={invite.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invite.email}
                            {declined ? <Badge variant="outline">Declined</Badge> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invite.roleName ?? "Member"}
                            {declined
                              ? " · they turned this down"
                              : ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={invite.roleId == null || resendMutation.isPending}
                              onClick={() =>
                                invite.roleId != null &&
                                resendMutation.mutate({ email: invite.email, roleId: invite.roleId })
                              }
                            >
                              {declined ? "Ask again" : "Resend"}
                            </Button>
                            {declined ? null : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={revokeMutation.isPending}
                                onClick={() => revokeMutation.mutate(invite.id)}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={removeTarget !== null} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.name ?? removeTarget?.email ?? "this member"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll lose access to this organization immediately. You can re-invite them
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={transferTarget !== null} onOpenChange={() => setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Make {transferTarget?.name ?? transferTarget?.email ?? "this member"} the owner?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll become a regular member and lose owner access. They&apos;ll become the
              organization&apos;s sole owner. This can only be undone by having them transfer it
              back to you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => transferTarget && transferMutation.mutate(transferTarget.id)}
            >
              Make owner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={historyTarget !== null} onOpenChange={(open) => !open && setHistoryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin request</DialogTitle>
          </DialogHeader>
          {historyTarget ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">
                  {historyTarget.name ?? historyTarget.email ?? "This member"}
                </span>
                <Badge variant={historyTarget.status === "approved" ? "secondary" : "outline"}>
                  {historyTarget.status === "approved"
                    ? "Approved"
                    : historyTarget.status === "withdrawn"
                      ? "Withdrawn"
                      : "Declined"}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Their reason
                </p>
                <p className="mt-1 whitespace-pre-line">{historyTarget.reason}</p>
              </div>
              {historyTarget.reviewNote ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Note from {historyTarget.reviewedByName ?? "the reviewer"}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{historyTarget.reviewNote}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHistoryTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
