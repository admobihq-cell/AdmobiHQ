"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CircleHelp, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  ADVERTISER_PERMISSIONS,
  ADVERTISER_STARTER_ROLES,
  type AdvertiserPermission,
  type AdvertiserRoleDto,
} from "@workspace/ops-contracts"
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
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  createOrgRole,
  deleteOrgRole,
  listOrgRoles,
  updateOrgRole,
} from "@/lib/org-client"

const PERMISSION_LABELS: Record<AdvertiserPermission, string> = {
  "campaigns:read": "View campaigns",
  "campaigns:write": "Edit campaigns",
  "campaigns:submit": "Submit campaigns",
  "creatives:write": "Upload creatives",
  "reports:read": "View reports",
  "billing:read": "View billing",
  "billing:write": "Manage billing",
  "team:manage": "Manage team",
  "org:manage": "Manage organization",
  "activity:read": "View activity",
  "support:read_all": "See all support cases",
}

const SEEDED_ROLE_GUIDE: Array<{
  name: string
  summary: string
  permissions: readonly AdvertiserPermission[] | "all"
}> = [
  {
    name: "Admin",
    summary:
      "Full control of the organization. Admins can rename the company, invite or remove people, edit roles, and do everything a Manager can — including submitting campaigns and managing billing when it ships.",
    permissions: "all",
  },
  {
    name: "Manager",
    summary:
      "Runs day-to-day advertising work: create and edit campaigns, upload creative, and submit campaigns for review. Can see billing (read-only), org activity, and all support cases. Cannot rename the org or change who is on the team.",
    permissions: ADVERTISER_STARTER_ROLES.Manager,
  },
  {
    name: "Member",
    summary:
      "Prepares campaigns and creative but cannot submit for review — that spend boundary stays with Managers and Admins. Good for designers or junior marketers who draft work others approve.",
    permissions: ADVERTISER_STARTER_ROLES.Member,
  },
  {
    name: "Viewer",
    summary:
      "Read-only access to campaigns and reports. Useful for stakeholders, finance, or agencies that need visibility without editing anything.",
    permissions: ADVERTISER_STARTER_ROLES.Viewer,
  },
]

const ROLES_KEY = ["customer-org-roles"] as const

type RoleEdit = { name: string; permissions: AdvertiserPermission[] }

function isDirty(edit: RoleEdit, role: AdvertiserRoleDto): boolean {
  return (
    edit.name !== role.name ||
    edit.permissions.length !== role.permissions.length ||
    edit.permissions.some((p) => !role.permissions.includes(p))
  )
}

function EditableRoleName({
  value,
  onChange,
}: {
  value: string
  onChange: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false)
        }}
        className="h-7 text-sm font-medium"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      className="min-w-0 flex-1 truncate rounded-sm text-left text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {value || "Untitled"}
    </button>
  )
}

export function RolesSettingsView() {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<Record<number, RoleEdit>>({})
  const [deleteTarget, setDeleteTarget] = useState<AdvertiserRoleDto | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRolePermissions, setNewRolePermissions] = useState<AdvertiserPermission[]>([])

  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => listOrgRoles(getToken),
    enabled: isAuthEnabled(),
    retry: false,
  })
  const roles = rolesQuery.data ?? null

  useEffect(() => {
    if (!roles) return
    setEdits((prev) => {
      const next: Record<number, RoleEdit> = {}
      for (const role of roles) {
        next[role.id] = prev[role.id] ?? {
          name: role.name,
          permissions: [...role.permissions],
        }
      }
      return next
    })
  }, [roles])

  function setRoleName(roleId: number, name: string) {
    setEdits((prev) => ({ ...prev, [roleId]: { ...prev[roleId]!, name } }))
  }

  function togglePermission(roleId: number, permission: AdvertiserPermission, checked: boolean) {
    setEdits((prev) => {
      const current = prev[roleId]!
      const permissions = checked
        ? [...current.permissions, permission]
        : current.permissions.filter((p) => p !== permission)
      return { ...prev, [roleId]: { ...current, permissions } }
    })
  }

  const saveMutation = useMutation({
    mutationFn: (role: AdvertiserRoleDto) => {
      const edit = edits[role.id]!
      return updateOrgRole(getToken, role.id, {
        name: edit.name.trim(),
        permissions: edit.permissions,
      })
    },
    onSuccess: async (_result, role) => {
      toast.success(
        role.isStarter
          ? `Customized "${edits[role.id]!.name.trim()}" for this organization`
          : `Updated "${edits[role.id]!.name.trim()}"`,
      )
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY })
      await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (role: AdvertiserRoleDto) => deleteOrgRole(getToken, role.id),
    onSuccess: async (_r, role) => {
      toast.success(`Deleted "${role.name}"`)
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createOrgRole(getToken, {
        name: newRoleName.trim(),
        permissions: newRolePermissions,
      }),
    onSuccess: async () => {
      toast.success(`Created "${newRoleName.trim()}"`)
      setNewRoleName("")
      setNewRolePermissions([])
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (rolesQuery.isError) {
    return (
      <Card className="shadow-none">
        <CardContent className="space-y-2 p-6">
          <h3 className="text-base font-medium">Roles</h3>
          <p className="text-sm text-muted-foreground">
            Only organization admins can edit roles. Ask an admin if you need a permission change.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (roles === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Permission matrix
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setGuideOpen(true)}
                aria-label="Explain seeded roles"
              >
                <CircleHelp className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">What do these roles mean?</TooltipContent>
          </Tooltip>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          Add role
        </Button>
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-10 min-w-44 bg-card">Permission</TableHead>
                <TableHead className="min-w-28 text-center">Admin</TableHead>
                {roles.map((role) => {
                  const edit = edits[role.id]
                  const dirty = edit ? isDirty(edit, role) : false
                  return (
                    <TableHead key={role.id} className="min-w-36 py-3 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <EditableRoleName
                            value={edit?.name ?? role.name}
                            onChange={(name) => setRoleName(role.id, name)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            disabled={
                              role.isStarter ||
                              role.memberCount > 0 ||
                              deleteMutation.isPending
                            }
                            onClick={() => setDeleteTarget(role)}
                            title={
                              role.isStarter
                                ? "Starter templates can't be deleted — save edits to customize for this org"
                                : role.memberCount > 0
                                  ? "Reassign members before deleting"
                                  : "Delete role"
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            <span className="sr-only">Delete role</span>
                          </Button>
                        </div>
                        {role.isStarter ? (
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Starter
                          </p>
                        ) : null}
                        {dirty ? (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            disabled={
                              saveMutation.isPending || !edit?.name.trim()
                            }
                            loading={
                              saveMutation.isPending &&
                              saveMutation.variables?.id === role.id
                            }
                            loadingText="Saving…"
                            onClick={() => saveMutation.mutate(role)}
                          >
                            Save
                          </Button>
                        ) : null}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ADVERTISER_PERMISSIONS.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    {PERMISSION_LABELS[permission]}
                  </TableCell>
                  <TableCell className="text-center">
                    <Check
                      className="mx-auto size-4 text-muted-foreground"
                      aria-label="Always included for admins"
                    />
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role.id} className="text-center">
                      <Checkbox
                        checked={edits[role.id]?.permissions.includes(permission) ?? false}
                        onCheckedChange={(checked) =>
                          togglePermission(role.id, permission, checked === true)
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Admins always have every permission. Saving a starter role creates a customized copy for
        this organization only — other advertisers keep the shared defaults.
      </p>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Seeded roles</DialogTitle>
            <DialogDescription>
              Every organization starts with these defaults. Customize them in the matrix or add
              your own — edits only affect your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {SEEDED_ROLE_GUIDE.map((role) => (
              <div key={role.name} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{role.name}</h3>
                  {role.name !== "Admin" ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Starter
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{role.summary}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {role.permissions === "all" ? (
                    <li className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Every permission
                    </li>
                  ) : (
                    role.permissions.map((permission) => (
                      <li
                        key={permission}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {PERMISSION_LABELS[permission]}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Got it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open && !createMutation.isPending) {
            setNewRoleName("")
            setNewRolePermissions([])
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>
              Name the role and choose which actions its members can take.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-role-name">Role name</Label>
              <Input
                id="new-role-name"
                autoFocus
                placeholder="e.g. Media buyer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border p-1">
                {ADVERTISER_PERMISSIONS.map((permission) => (
                  <label
                    key={permission}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={newRolePermissions.includes(permission)}
                      disabled={createMutation.isPending}
                      onCheckedChange={(checked) =>
                        setNewRolePermissions((prev) =>
                          checked === true
                            ? [...prev, permission]
                            : prev.filter((p) => p !== permission),
                        )
                      }
                    />
                    {PERMISSION_LABELS[permission]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={createMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!newRoleName.trim() || createMutation.isPending}
              loading={createMutation.isPending}
              loadingText="Creating…"
              onClick={() => createMutation.mutate()}
            >
              <Plus aria-hidden />
              Create role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Only custom roles with no members or pending invites can
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
