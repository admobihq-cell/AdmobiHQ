"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"

import type { AdvertiserInviteInput } from "@workspace/ops-contracts"
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
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import {
  getOrg,
  inviteOrgMember,
  listOrgMembers,
  listOrgRoles,
  removeOrgMember,
  renameOrg,
  revokeOrgInvitation,
  transferOrgOwnership,
  updateOrgMember,
} from "@/lib/org-client"

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return { getToken: async () => null as string | null, isLoaded: true }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

const ORG_KEY = ["customer-org"] as const
const MEMBERS_KEY = ["customer-org-members"] as const
const ROLES_KEY = ["customer-org-roles"] as const

export function TeamSettingsView() {
  const { getToken, isLoaded } = useAuthIfEnabled()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState<string>("")
  const [orgName, setOrgName] = useState<string | null>(null)

  const orgQuery = useQuery({
    queryKey: ORG_KEY,
    queryFn: () => getOrg(getToken),
    enabled: isLoaded,
  })

  const membersQuery = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () => listOrgMembers(getToken),
    enabled: isLoaded,
    retry: false,
  })

  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => listOrgRoles(getToken),
    enabled: isLoaded && membersQuery.isSuccess,
    retry: false,
  })

  const canManageTeam = membersQuery.isSuccess
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

  const roleChangeMutation = useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: number; roleId: number }) =>
      updateOrgMember(getToken, memberId, { roleId, isOwner: false }),
    onSuccess: async () => {
      toast.success("Role updated")
      await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const transferMutation = useMutation({
    mutationFn: (memberId: number) => transferOrgOwnership(getToken, memberId),
    onSuccess: async () => {
      toast.success("Admin transferred")
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

  if (!isLoaded || orgQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (orgQuery.isError) {
    return <p className="text-sm text-destructive">{(orgQuery.error as Error).message}</p>
  }

  if (!canManageTeam) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6">
          <p className="text-sm text-muted-foreground">
            Only organization admins can manage the team. Ask an admin if you need to invite
            someone.
          </p>
          {orgQuery.data ? (
            <p className="text-sm">
              You&apos;re in <strong>{orgQuery.data.name || "your organization"}</strong> (
              {orgQuery.data.memberCount} member
              {orgQuery.data.memberCount === 1 ? "" : "s"}).
            </p>
          ) : null}
        </CardContent>
      </Card>
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
              />
            </div>
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
          </div>
        </CardContent>
      </Card>

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
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.name ?? member.email ?? member.clerkUserId}</div>
                    {member.email ? (
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {member.isOwner ? (
                      "Admin"
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
                          onClick={() => transferMutation.mutate(member.id)}
                        >
                          Make admin
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(member.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {invitations.length > 0 ? (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium">Pending invitations</h3>
              <Table>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        {invite.email}
                        <div className="text-xs text-muted-foreground">
                          {invite.roleName ?? "Member"} · expires{" "}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(invite.id)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
