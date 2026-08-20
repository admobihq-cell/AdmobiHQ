"use client"

import { useEffect, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { OPS_PERMISSIONS, type OpsPermission, type OpsRoleDto } from "@workspace/ops-contracts"

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
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { useOpsClient } from "@/lib/ops-client"

const PERMISSION_LABELS: Record<OpsPermission, string> = {
  leads: "Campaign Leads",
  fleet: "Fleet Partners",
  drivers: "Drivers",
  waitlist: "Waitlist",
  media_kit: "Media Kit",
  announcements: "Announcements",
  support: "Support",
  finances: "Finances",
  content: "Content (CMS)",
  flags: "Settings",
  activity: "Activity",
  driver_applications: "Driver Applications",
}

type RoleEdit = { name: string; permissions: OpsPermission[] }

function isDirty(edit: RoleEdit, role: OpsRoleDto): boolean {
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

function RolesTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-10 bg-card">Permission</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableHead key={i} className="min-w-36 py-3 align-top">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {OPS_PERMISSIONS.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    {PERMISSION_LABELS[permission]}
                  </TableCell>
                  <TableCell className="text-center">
                    <Check
                      className="mx-auto h-4 w-4 text-muted-foreground"
                      aria-label="Always included for Admins"
                    />
                  </TableCell>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableCell key={i} className="text-center">
                      <Skeleton className="mx-auto h-4 w-4 rounded-[4px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function RolesView() {
  const client = useOpsClient()
  const [roles, setRoles] = useState<OpsRoleDto[] | null>(null)
  const [edits, setEdits] = useState<Record<number, RoleEdit>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OpsRoleDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRolePermissions, setNewRolePermissions] = useState<OpsPermission[]>([])
  const [creating, setCreating] = useState(false)

  function reload() {
    client.roles
      .list()
      .then((res) => setRoles(res.items))
      .catch((err) => toast.error(formatApiError(err)))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  // Seeds edits for new roles without clobbering in-progress edits on reload.
  useEffect(() => {
    if (!roles) return
    setEdits((prev) => {
      const next: Record<number, RoleEdit> = {}
      for (const role of roles) {
        next[role.id] = prev[role.id] ?? { name: role.name, permissions: role.permissions }
      }
      return next
    })
  }, [roles])

  function setRoleName(roleId: number, name: string) {
    setEdits((prev) => ({ ...prev, [roleId]: { ...prev[roleId]!, name } }))
  }

  function togglePermission(roleId: number, permission: OpsPermission, checked: boolean) {
    setEdits((prev) => {
      const current = prev[roleId]!
      const permissions = checked
        ? [...current.permissions, permission]
        : current.permissions.filter((p) => p !== permission)
      return { ...prev, [roleId]: { ...current, permissions } }
    })
  }

  function toggleNewRolePermission(permission: OpsPermission, checked: boolean) {
    setNewRolePermissions((prev) =>
      checked ? [...prev, permission] : prev.filter((p) => p !== permission),
    )
  }

  function resetNewRole() {
    setNewRoleName("")
    setNewRolePermissions([])
  }

  async function handleSave(role: OpsRoleDto) {
    const edit = edits[role.id]
    if (!edit || !edit.name.trim()) return
    setSavingId(role.id)
    try {
      await client.roles.update(role.id, {
        name: edit.name.trim(),
        permissions: edit.permissions,
      })
      toast.success(`Updated "${edit.name.trim()}"`)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(role: OpsRoleDto) {
    setDeleting(true)
    try {
      await client.roles.delete(role.id)
      toast.success(`Deleted "${role.name}"`)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreate() {
    if (!newRoleName.trim()) return
    setCreating(true)
    try {
      await client.roles.create({ name: newRoleName.trim(), permissions: newRolePermissions })
      toast.success(`Created "${newRoleName.trim()}"`)
      resetNewRole()
      setCreateOpen(false)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setCreating(false)
    }
  }

  const permissionColumns: ColumnDef<OpsPermission, any>[] = roles
    ? [
        {
          id: "permission",
          header: "Permission",
          meta: { className: "sticky left-0 z-10 bg-card font-medium" },
          cell: ({ row }) => PERMISSION_LABELS[row.original],
        },
        {
          id: "admin",
          header: "Admin",
          meta: { className: "text-center" },
          cell: () => (
            <Check
              className="mx-auto h-4 w-4 text-muted-foreground"
              aria-label="Always included for Admins"
            />
          ),
        },
        ...roles.map(
          (role): ColumnDef<OpsPermission, any> => ({
            id: `role-${role.id}`,
            meta: { headerClassName: "min-w-36 py-3 align-top", cellClassName: "text-center" },
            header: () => {
              const edit = edits[role.id]
              const dirty = edit ? isDirty(edit, role) : false
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <EditableRoleName
                      value={edit?.name ?? role.name}
                      onChange={(name) => setRoleName(role.id, name)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                      disabled={deleting || role.memberCount > 0}
                      onClick={() => setDeleteTarget(role)}
                      title={
                        role.memberCount > 0
                          ? "Reassign members before deleting this role"
                          : "Delete role"
                      }
                    >
                      <Trash2 aria-hidden />
                      <span className="sr-only">Delete role</span>
                    </Button>
                  </div>
                  {dirty && (
                    <Button
                      type="button"
                      size="xs"
                      className="w-full"
                      disabled={savingId === role.id || !edit?.name.trim()}
                      loading={savingId === role.id}
                      loadingText="Saving…"
                      onClick={() => void handleSave(role)}
                    >
                      Save
                    </Button>
                  )}
                </div>
              )
            },
            cell: ({ row }) => (
              <Checkbox
                checked={edits[role.id]?.permissions.includes(row.original) ?? false}
                onCheckedChange={(checked) =>
                  togglePermission(role.id, row.original, checked === true)
                }
              />
            ),
          }),
        ),
      ]
    : []

  return (
    <div className="flex flex-1 flex-col gap-6">
      {roles === null ? (
        <RolesTableSkeleton />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Permission matrix
            </p>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              Add role
            </Button>
          </div>
          <Card className="overflow-hidden p-0 shadow-none">
            <CardContent className="p-0">
              <DataTable
                columns={permissionColumns}
                data={[...OPS_PERMISSIONS]}
                getRowId={(permission) => permission}
                headerRowClassName="hover:bg-transparent"
              />
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Admins always have every permission and aren&apos;t edited here — manage admin
            membership from the Members tab.
          </p>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open && !creating) resetNewRole()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>
              Name the role and choose which sections its members can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-role-name">Role name</Label>
              <Input
                id="new-role-name"
                autoFocus
                placeholder="e.g. Support Lead"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border p-1">
                {OPS_PERMISSIONS.map((permission) => (
                  <label
                    key={permission}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={newRolePermissions.includes(permission)}
                      disabled={creating}
                      onCheckedChange={(checked) =>
                        toggleNewRolePermission(permission, checked === true)
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
              <Button type="button" variant="outline" disabled={creating}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!newRoleName.trim() || creating}
              loading={creating}
              loadingText="Creating…"
              onClick={() => void handleCreate()}
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
              This can&apos;t be undone. Only roles with no members assigned can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && void handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
