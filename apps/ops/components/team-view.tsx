"use client"

import { useEffect, useId, useState } from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@clerk/nextjs"
import type {
  NotYetInvitedDto,
  OpsRoleDto,
  TeamDto,
  TeamInvitationDto,
  TeamMemberDto,
  TeamInviteInput,
  TeamRoleUpdateInput,
} from "@workspace/ops-contracts"

import { formatApiError } from "@workspace/ops-api-client"
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
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

/** Select values encode the tier/role choice as a single string: "admin" or "member:<roleId>". */
const ADMIN_VALUE = "admin"
const memberValue = (roleId: number) => `member:${roleId}`

function decodeTierValue(value: string): TeamRoleUpdateInput | null {
  if (value === ADMIN_VALUE) return { tier: "admin" }
  const roleId = Number(value.slice("member:".length))
  return Number.isFinite(roleId) ? { tier: "member", roleId } : null
}

function TierSelect({
  value,
  roles,
  disabled,
  onChange,
  triggerClassName = "w-40",
}: {
  value: string
  roles: OpsRoleDto[]
  disabled?: boolean
  onChange: (input: TeamRoleUpdateInput) => void
  triggerClassName?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const decoded = decodeTierValue(v)
        if (decoded) onChange(decoded)
      }}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Choose a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ADMIN_VALUE}>Admin</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={memberValue(role.id)}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RoleBadge({ role }: { role: "admin" | "member" }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"}>
      {role === "admin" ? "Admin" : "Member"}
    </Badge>
  )
}

function MembersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-8 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function TeamView() {
  const client = useOpsClient()
  const { userId: currentUserId } = useAuth()
  const inviteEmailId = useId()

  const [team, setTeam] = useState<TeamDto | null>(null)
  const [roles, setRoles] = useState<OpsRoleDto[]>([])
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(
    null
  )
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteTier, setInviteTier] = useState<TeamRoleUpdateInput>({
    tier: "member",
    roleId: 0,
  })
  const [inviting, setInviting] = useState(false)

  function reload() {
    client.team
      .list()
      .then(setTeam)
      .catch((err) => toast.error(formatApiError(err)))
    client.roles
      .list()
      .then((res) => {
        setRoles(res.items)
        setInviteTier((prev) =>
          prev.tier === "member" && !prev.roleId && res.items[0]
            ? { tier: "member", roleId: res.items[0].id }
            : prev
        )
      })
      .catch((err) => toast.error(formatApiError(err)))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    if (inviteTier.tier === "member" && !inviteTier.roleId) {
      toast.error("Create a role first")
      return
    }
    setInviting(true)
    try {
      const body: TeamInviteInput = { email: inviteEmail.trim(), ...inviteTier }
      await client.team.invite(body)
      toast.success(`Invited ${inviteEmail.trim()}`)
      setInviteEmail("")
      setInviteOpen(false)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(
    member: TeamMemberDto,
    input: TeamRoleUpdateInput
  ) {
    setPendingUserId(member.userId)
    try {
      await client.team.updateRole(member.userId, input)
      toast.success(`Updated ${member.email}'s role`)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRemove(member: TeamMemberDto) {
    setPendingUserId(member.userId)
    try {
      await client.team.removeMember(member.userId)
      toast.success(`Removed ${member.email}`)
      setRemoveTarget(null)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRevoke(invitation: TeamInvitationDto) {
    setPendingInvitationId(invitation.id)
    try {
      await client.team.revokeInvitation(invitation.id)
      toast.success(`Revoked invitation for ${invitation.email}`)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setPendingInvitationId(null)
    }
  }

  function handlePrefillInvite(candidate: NotYetInvitedDto) {
    setInviteEmail(candidate.email)
    setInviteOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-3">
        <Card className="overflow-hidden p-0 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-end gap-2 border-b p-3">
              <Dialog
                open={inviteOpen}
                onOpenChange={(open) => {
                  setInviteOpen(open)
                  if (!open) setInviteEmail("")
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" size="sm">
                    <UserPlus aria-hidden />
                    Invite someone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite someone</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={inviteEmailId}>Email</Label>
                      <Input
                        id={inviteEmailId}
                        type="email"
                        placeholder="name@admobihq.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={inviting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <TierSelect
                        value={
                          inviteTier.tier === "admin"
                            ? ADMIN_VALUE
                            : memberValue(inviteTier.roleId)
                        }
                        roles={roles}
                        disabled={inviting}
                        onChange={setInviteTier}
                        triggerClassName="w-full"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={() => void handleInvite()}
                      loading={inviting}
                      loadingText="Inviting…"
                      disabled={!inviteEmail.trim()}
                    >
                      <UserPlus aria-hidden />
                      Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {team === null ? (
              <MembersTableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.members.map((member) => {
                    const isSelf = member.userId === currentUserId
                    const locked = member.role === "admin"
                    const value =
                      member.role === "admin"
                        ? ADMIN_VALUE
                        : member.roleId
                          ? memberValue(member.roleId)
                          : ""
                    return (
                      <TableRow key={member.userId}>
                        <TableCell className="font-medium">
                          {member.email}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                          {member.role === "member" && !member.roleId ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (no role assigned yet)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TierSelect
                              value={value}
                              roles={roles}
                              disabled={
                                pendingUserId === member.userId || locked
                              }
                              onChange={(input) =>
                                void handleRoleChange(member, input)
                              }
                            />
                            {locked ? (
                              <span
                                className="text-xs text-muted-foreground"
                                title="Admins are protected — change their role in Clerk instead"
                              >
                                Protected
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(member.joinedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pendingUserId === member.userId || locked}
                            title={
                              locked
                                ? "Admins are protected and can't be removed here"
                                : undefined
                            }
                            onClick={() => setRemoveTarget(member)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {team && team.invitations.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Pending invitations
          </p>
          <Card className="overflow-hidden p-0 shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={invitation.role} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(invitation.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pendingInvitationId === invitation.id}
                          onClick={() => void handleRevoke(invitation)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {team && team.notYetInvited.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Not yet on the team
          </p>
          <p className="text-xs text-muted-foreground">
            These people already have an Admobi account but haven&apos;t been
            added to the console.
          </p>
          <Card className="overflow-hidden p-0 shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {team.notYetInvited.map((candidate) => (
                    <TableRow key={candidate.userId}>
                      <TableCell className="font-medium">
                        {candidate.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrefillInvite(candidate)}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={() => setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll immediately lose access to the ops console. You can
              re-invite them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removeTarget && void handleRemove(removeTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
