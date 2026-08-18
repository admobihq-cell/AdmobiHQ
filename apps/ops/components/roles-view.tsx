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
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
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

export function RolesView() {
  const client = useOpsClient()
  const [roles, setRoles] = useState<OpsRoleDto[] | null>(null)
  const [edits, setEdits] = useState<Record<number, RoleEdit>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OpsRoleDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
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
      await client.roles.create({ name: newRoleName.trim(), permissions: [] })
      toast.success(`Created "${newRoleName.trim()}"`)
      setNewRoleName("")
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Card className="shadow-none">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Create a role</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Support Lead"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              disabled={creating}
              className="max-w-xs"
            />
            <Button
              type="button"
              onClick={() => void handleCreate()}
              loading={creating}
              loadingText="Creating…"
              disabled={!newRoleName.trim()}
            >
              <Plus aria-hidden />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {roles === null ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Permission matrix
          </p>
          <Card className="overflow-hidden p-0 shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-10 bg-card">Permission</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="min-w-44 py-3 align-top">
                        <div className="space-y-1.5">
                          <Input
                            value={edits[role.id]?.name ?? role.name}
                            onChange={(e) => setRoleName(role.id, e.target.value)}
                            className="h-8 text-sm font-medium"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-normal normal-case text-muted-foreground">
                              {role.memberCount} member{role.memberCount === 1 ? "" : "s"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={deleting || role.memberCount > 0}
                              onClick={() => setDeleteTarget(role)}
                              title={
                                role.memberCount > 0
                                  ? "Reassign members before deleting this role"
                                  : "Delete role"
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        </div>
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
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="sticky left-0 z-10 bg-card" />
                    <TableCell />
                    {roles.map((role) => {
                      const edit = edits[role.id]
                      const dirty = edit ? isDirty(edit, role) : false
                      return (
                        <TableCell key={role.id} className="text-center">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!dirty || savingId === role.id || !edit?.name.trim()}
                            loading={savingId === role.id}
                            loadingText="Saving…"
                            onClick={() => void handleSave(role)}
                          >
                            Save
                          </Button>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Admins always have every permission and aren&apos;t edited here — manage admin
            membership from the Members tab.
          </p>
        </div>
      )}

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
