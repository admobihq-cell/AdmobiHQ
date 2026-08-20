"use client"

import { useEffect, useRef, useState } from "react"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { TablePagination } from "@/components/ui/table-pagination"
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageSize, setPageSize] = useState(25)
  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const refresh = async (targetPage = 1, targetPageSize = pageSize) => {
    const result = await client.notifications.list({
      page: targetPage,
      pageSize: targetPageSize,
      sortDir,
    })
    setData(result)
  }

  const isFirstSort = useRef(true)
  useEffect(() => {
    if (isFirstSort.current) {
      isFirstSort.current = false
      return
    }
    void refresh(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortDir])

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

  const columns: ColumnDef<AnnouncementDto, any>[] = [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableSortHeader
          label="Sent"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      meta: { headerClassName: "w-[9%]", cellClassName: "max-w-0 truncate text-muted-foreground" },
      cell: ({ row }) => (
        <span title={formatDateTime(row.original.created_at)}>
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "title",
      header: "Title",
      meta: { headerClassName: "w-[14%]", cellClassName: "max-w-0 truncate font-medium" },
      cell: ({ row }) => <span title={row.original.title}>{row.original.title}</span>,
    },
    {
      id: "category",
      header: "Category",
      meta: { headerClassName: "w-[10%]", cellClassName: "max-w-0 overflow-hidden" },
      cell: ({ row }) => <Badge variant="outline">{row.original.category ?? "announcement"}</Badge>,
    },
    {
      id: "target",
      header: "Target",
      meta: { headerClassName: "w-[13%]", cellClassName: "max-w-0 truncate" },
      cell: ({ row }) => {
        const targets = describeAnnouncementTargets(row.original.target_apps)
        return <span title={targets}>{targets}</span>
      },
    },
    {
      id: "message",
      header: "Message",
      meta: { headerClassName: "w-[26%]", cellClassName: "max-w-0" },
      cell: ({ row }) => (
        <button
          type="button"
          className="block w-full truncate text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => setViewing(row.original)}
          title="View full announcement"
        >
          {row.original.body}
        </button>
      ),
    },
    {
      id: "delivered",
      header: "Delivered",
      meta: { headerClassName: "w-[10%]", cellClassName: "max-w-0 truncate tabular-nums" },
      cell: ({ row }) => {
        const r = row.original
        return (
          <span
            title={
              r.invalid_count > 0
                ? `${r.delivered_count}/${r.target_count} delivered · ${r.invalid_count} invalid`
                : `${r.delivered_count}/${r.target_count} delivered`
            }
          >
            {r.delivered_count}/{r.target_count}
          </span>
        )
      },
    },
    {
      id: "status",
      header: "Status",
      meta: { headerClassName: "w-[10%]", cellClassName: "max-w-0" },
      cell: ({ row }) =>
        row.original.deleted_at ? (
          <Badge variant="destructive">Deleted</Badge>
        ) : (
          <Badge variant={row.original.status === "failed" ? "destructive" : "secondary"}>
            {row.original.status}
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { headerClassName: "w-[8%] text-right", cellClassName: "text-right" },
      cell: ({ row }) => {
        const announcement = row.original
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="View announcement"
                  onClick={() => setViewing(announcement)}
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
                      title: announcement.title,
                      body: announcement.body,
                      category: announcement.category ?? "announcement",
                      targetApps: announcement.target_apps,
                      mode: "resend",
                      image_url: announcement.image_url,
                    })
                  }
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resend</TooltipContent>
            </Tooltip>
            {announcement.deleted_at ? null : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete announcement"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                    onClick={() => setPendingDelete(announcement)}
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ]

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
        {!data.items.length ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">No announcements yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Sent broadcasts will appear here.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data.items}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(row) => String(row.id)}
            tableClassName="table-fixed w-full"
          />
        )}
      </div>

      <TablePagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={(nextPage) => void refresh(nextPage)}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size)
          void refresh(1, size)
        }}
      />

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
