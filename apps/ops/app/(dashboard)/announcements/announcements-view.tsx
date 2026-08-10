"use client"

import { useState } from "react"
import { Eye, Loader2, Plus, Radio, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { describeAnnouncementTargets, type AnnouncementDto } from "@workspace/ops-contracts"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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

import { PageHero } from "@/components/ui/page-hero"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

import {
  AnnouncementFormDialog,
  type AnnouncementFormValues,
} from "./announcement-form-dialog"

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
  targetApps: string[]
  mode: "new" | "resend"
  /** New upload (cropped JPEG). Prefer this over image_url when present. */
  imageBlob?: Blob | null
  /** Existing public image URL, e.g. when resending. */
  image_url?: string | null
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
  const [viewing, setViewing] = useState<AnnouncementDto | null>(null)
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
      let imageUrl = pending.image_url ?? undefined
      if (pending.imageBlob) {
        const uploaded = await client.notifications.uploadImage(
          new File([pending.imageBlob], "announcement.jpg", { type: "image/jpeg" }),
        )
        imageUrl = uploaded.url
      }
      await client.notifications.broadcast({
        title: pending.title,
        body: pending.body,
        category: pending.category as
          | "announcement"
          | "campaign"
          | "billing"
          | "promo"
          | "system",
        target_apps: pending.targetApps as ("customer-mobile" | "driver-mobile")[],
        image_url: imageUrl ?? null,
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

  const queueNewAnnouncement = (values: AnnouncementFormValues) => {
    setFormOpen(false)
    setPending({
      title: values.title,
      body: values.body,
      category: values.category,
      targetApps: values.targetApps,
      mode: "new",
      imageBlob: values.imageBlob,
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Announcements"
        description="Broadcast a message to the customer and/or driver app."
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus data-icon="inline-start" />
            New announcement
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-none [&_[data-slot=table-container]]:overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[9%]">Sent</TableHead>
              <TableHead className="w-[14%]">Title</TableHead>
              <TableHead className="w-[10%]">Category</TableHead>
              <TableHead className="w-[13%]">Target</TableHead>
              <TableHead className="w-[26%]">Message</TableHead>
              <TableHead className="w-[10%]">Delivered</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[8%] text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.items.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="text-sm font-medium text-foreground">No announcements yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sent broadcasts will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-0 truncate text-muted-foreground" title={formatDateTime(row.created_at)}>
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell className="max-w-0 truncate font-medium" title={row.title}>
                    {row.title}
                  </TableCell>
                  <TableCell className="max-w-0 overflow-hidden">
                    <Badge variant="outline">{row.category ?? "announcement"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-0 truncate" title={describeAnnouncementTargets(row.target_apps)}>
                    {describeAnnouncementTargets(row.target_apps)}
                  </TableCell>
                  <TableCell className="max-w-0">
                    <button
                      type="button"
                      className="block w-full truncate text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => setViewing(row)}
                      title="View full announcement"
                    >
                      {row.body}
                    </button>
                  </TableCell>
                  <TableCell
                    className="max-w-0 truncate tabular-nums"
                    title={
                      row.invalid_count > 0
                        ? `${row.delivered_count}/${row.target_count} delivered · ${row.invalid_count} invalid`
                        : `${row.delivered_count}/${row.target_count} delivered`
                    }
                  >
                    {row.delivered_count}/{row.target_count}
                  </TableCell>
                  <TableCell className="max-w-0">
                    {row.deleted_at ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : (
                      <Badge variant={row.status === "failed" ? "destructive" : "secondary"}>
                        {row.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View announcement"
                            onClick={() => setViewing(row)}
                          >
                            <Eye />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Resend announcement"
                            disabled={saving}
                            onClick={() =>
                              setPending({
                                title: row.title,
                                body: row.body,
                                category: row.category ?? "announcement",
                                targetApps: row.target_apps,
                                mode: "resend",
                                image_url: row.image_url,
                              })
                            }
                          >
                            <RotateCcw />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Resend</TooltipContent>
                      </Tooltip>
                      {row.deleted_at ? null : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete announcement"
                              className="text-destructive hover:text-destructive"
                              disabled={deleting}
                              onClick={() => setPendingDelete(row)}
                            >
                              <Trash2 />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setPending(null)
        }}
        saving={saving}
        onSubmit={queueNewAnnouncement}
      />

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.title}</DialogTitle>
                <DialogDescription>
                  Sent {formatDateTime(viewing.created_at)}
                  {viewing.sent_by_email ? ` · ${viewing.sent_by_email}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{viewing.category ?? "announcement"}</Badge>
                <Badge variant="outline">{describeAnnouncementTargets(viewing.target_apps)}</Badge>
                {viewing.deleted_at ? (
                  <Badge variant="destructive">Deleted</Badge>
                ) : (
                  <Badge variant={viewing.status === "failed" ? "destructive" : "secondary"}>
                    {viewing.status}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {viewing.delivered_count}/{viewing.target_count} delivered
                  {viewing.invalid_count > 0 ? ` · ${viewing.invalid_count} invalid` : ""}
                </span>
              </div>

              {viewing.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URL; Next Image not needed here
                <img
                  src={viewing.image_url}
                  alt=""
                  className="max-h-64 w-full rounded-lg border object-cover"
                />
              ) : null}

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {viewing.body}
              </p>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setPending({
                      title: viewing.title,
                      body: viewing.body,
                      category: viewing.category ?? "announcement",
                      targetApps: viewing.target_apps,
                      mode: "resend",
                      image_url: viewing.image_url,
                    })
                    setViewing(null)
                  }}
                >
                  <RotateCcw data-icon="inline-start" />
                  Resend
                </Button>
                {viewing.deleted_at ? null : (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => {
                      setPendingDelete(viewing)
                      setViewing(null)
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Radio className="size-4" />
              {pending
                ? `${pending.mode === "resend" ? "Resend" : "Send"} to ${describeAnnouncementTargets(pending.targetApps)}?`
                : "Send announcement?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.mode === "resend" ? (
                <>
                  This sends &ldquo;{pending.title}&rdquo; again as a new push to every installed{" "}
                  {describeAnnouncementTargets(pending.targetApps)} app
                  {pending.image_url || pending.imageBlob ? ", including its image" : ""}. This
                  can&apos;t be undone.
                </>
              ) : (
                <>
                  This sends a real push notification to every installed{" "}
                  {pending ? describeAnnouncementTargets(pending.targetApps) : ""} app
                  {pending?.imageBlob ? ", with your attached image" : ""}. This can&apos;t be
                  undone.
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
              &ldquo;{pendingDelete?.title}&rdquo; will be hidden from the customer app. It stays
              in this list marked as Deleted for audit history.
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
