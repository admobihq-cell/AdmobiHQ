"use client"

import { useState } from "react"
import { Loader2, Plus, Radio, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ANNOUNCEMENT_FORM_FIELDS, type AnnouncementDto } from "@workspace/ops-contracts"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { SimpleFormDialog } from "@/components/entity-page"
import { PageHero } from "@/components/ui/page-hero"
import { formatDateTime, truncate } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type PendingBroadcast = {
  title: string
  body: string
  category: string
  mode: "new" | "resend"
}

type AnnouncementsViewProps = {
  initialData: Paginated<AnnouncementDto>
}

export function AnnouncementsView({ initialData }: AnnouncementsViewProps) {
  const client = useOpsClient()
  const [data, setData] = useState(initialData)
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState<PendingBroadcast | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AnnouncementDto | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const refresh = async () => {
    const result = await client.notifications.list({ page: 1, pageSize: 20 })
    setData(result)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await client.notifications.delete(pendingDelete.id)
      toast.success("Announcement deleted")
      setPendingDelete(null)
      await refresh()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setDeleting(false)
    }
  }

  const handleSend = async () => {
    if (!pending) return
    setSaving(true)
    try {
      await client.notifications.broadcast({
        title: pending.title,
        body: pending.body,
        category: pending.category as
          | "announcement"
          | "campaign"
          | "billing"
          | "promo"
          | "system",
      })
      toast.success(pending.mode === "resend" ? "Announcement resent" : "Announcement sent")
      setPending(null)
      setFormOpen(false)
      await refresh()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Operations"
        title="Announcements"
        description="Broadcast a message to every installed customer app."
      />

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus data-icon="inline-start" />
          New announcement
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.items.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <p className="text-sm font-medium text-foreground">No announcements yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sent broadcasts will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.created_at)}</TableCell>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.category ?? "announcement"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-sm text-muted-foreground">
                    {truncate(row.body, 80)}
                  </TableCell>
                  <TableCell>
                    {row.delivered_count}/{row.target_count}
                    {row.invalid_count > 0 ? ` · ${row.invalid_count} invalid` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "failed" ? "destructive" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          setPending({
                            title: row.title,
                            body: row.body,
                            category: row.category ?? "announcement",
                            mode: "resend",
                          })
                        }
                      >
                        <RotateCcw data-icon="inline-start" />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleting}
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SimpleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setPending(null)
        }}
        title="New announcement"
        fields={ANNOUNCEMENT_FORM_FIELDS}
        saving={saving}
        initial={{ category: "announcement" }}
        onSubmit={async (values) => {
          setFormOpen(false)
          setPending({
            title: String(values.title ?? ""),
            body: String(values.body ?? ""),
            category: String(values.category ?? "announcement"),
            mode: "new",
          })
        }}
      />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Radio className="size-4" />
              {pending?.mode === "resend" ? "Resend to all customers?" : "Send to all customers?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.mode === "resend" ? (
                <>
                  This sends &ldquo;{pending.title}&rdquo; again as a new push to every installed
                  customer app. This can&apos;t be undone.
                </>
              ) : (
                <>
                  This sends a real push notification to every installed customer app. This
                  can&apos;t be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleSend() }} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : pending?.mode === "resend" ? (
                "Resend"
              ) : (
                "Send"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4" />
              Delete this announcement?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; will be hidden from the customer app and this
              list. The record is kept for audit history, not permanently erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
