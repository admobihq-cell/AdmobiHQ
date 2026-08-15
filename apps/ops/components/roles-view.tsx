"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
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

function RoleCard({
  role,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  role: OpsRoleDto
  onSave: (roleId: number, name: string, permissions: OpsPermission[]) => Promise<void>
  onDelete: (role: OpsRoleDto) => void
  saving: boolean
  deleting: boolean
}) {
  const [name, setName] = useState(role.name)
  const [permissions, setPermissions] = useState<OpsPermission[]>(role.permissions)

  const dirty = name !== role.name || permissions.length !== role.permissions.length ||
    permissions.some((p) => !role.permissions.includes(p))

  function toggle(permission: OpsPermission, checked: boolean) {
    setPermissions((prev) =>
      checked ? [...prev, permission] : prev.filter((p) => p !== permission),
    )
  }

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs font-medium"
            />
            <p className="text-xs text-muted-foreground">
              {role.memberCount} member{role.memberCount === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting || role.memberCount > 0}
            onClick={() => onDelete(role)}
            title={
              role.memberCount > 0
                ? "Reassign members before deleting this role"
                : "Delete role"
            }
          >
            <Trash2 aria-hidden />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPS_PERMISSIONS.map((permission) => (
            <label
              key={permission}
              className="flex items-center gap-2 text-sm has-[:disabled]:cursor-not-allowed"
            >
              <Checkbox
                checked={permissions.includes(permission)}
                onCheckedChange={(checked) => toggle(permission, checked === true)}
              />
              {PERMISSION_LABELS[permission]}
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving || !name.trim()}
            loading={saving}
            loadingText="Saving…"
            onClick={() => void onSave(role.id, name.trim(), permissions)}
          >
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function RolesView() {
  const client = useOpsClient()
  const [roles, setRoles] = useState<OpsRoleDto[] | null>(null)
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

  async function handleSave(roleId: number, name: string, permissions: OpsPermission[]) {
    setSavingId(roleId)
    try {
      await client.roles.update(roleId, { name, permissions })
      toast.success(`Updated "${name}"`)
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
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onSave={handleSave}
              onDelete={setDeleteTarget}
              saving={savingId === role.id}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
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
