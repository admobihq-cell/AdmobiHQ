"use client"

import { RotateCcw, Trash2 } from "lucide-react"

import {
  ANNOUNCEMENT_FORM_FIELDS,
  describeAnnouncementTargets,
  type AnnouncementDto,
} from "@workspace/ops-contracts"

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

import { formatDateTime } from "@/lib/format"

import { AnnouncementPreview, hasTemplateTokens } from "./announcement-preview"

const CATEGORY_LABELS = Object.fromEntries(
  (ANNOUNCEMENT_FORM_FIELDS.find((field) => field.name === "category")?.options ?? []).map(
    (option) => [option.value, option.label],
  ),
)

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`
}

function Delivery({ announcement }: { announcement: AnnouncementDto }) {
  const target = announcement.target_count
  const delivered = Math.min(announcement.delivered_count, target)
  const invalid = Math.min(announcement.invalid_count, target - delivered)
  const unconfirmed = Math.max(target - delivered - invalid, 0)
  const pct = (n: number) => (target ? (n / target) * 100 : 0)

  if (target === 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Delivery</p>
        <p className="text-sm text-muted-foreground">No one had the selected apps installed.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Delivery</p>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{Math.round(pct(delivered))}%</span>{" "}
          <span className="text-muted-foreground">
            {delivered.toLocaleString()} of {target.toLocaleString()}
          </span>
        </p>
      </div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${delivered} of ${target} delivered, ${invalid} unreachable, ${unconfirmed} unconfirmed`}
      >
        <div className="bg-primary" style={{ width: `${pct(delivered)}%` }} />
        <div className="bg-destructive/70" style={{ width: `${pct(invalid)}%` }} />
      </div>
      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          {plural(delivered, "recipient")} reached
        </li>
        {invalid > 0 ? (
          <li className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive/70" aria-hidden />
            {plural(invalid, "device")} no longer registered, removed
          </li>
        ) : null}
        {unconfirmed > 0 ? (
          <li className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-muted-foreground/30" aria-hidden />
            {plural(unconfirmed, "push")} awaiting a receipt
          </li>
        ) : null}
      </ul>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  )
}

type AnnouncementDetailDialogProps = {
  announcement: AnnouncementDto | null
  onClose: () => void
  onResend: (announcement: AnnouncementDto) => void
  onDelete: (announcement: AnnouncementDto) => void
  saving?: boolean
  deleting?: boolean
}

export function AnnouncementDetailDialog({
  announcement: a,
  onClose,
  onResend,
  onDelete,
  saving = false,
  deleting = false,
}: AnnouncementDetailDialogProps) {
  return (
    <Dialog open={a !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {a ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 text-balance">{a.title}</DialogTitle>
              <DialogDescription>
                Sent {formatDateTime(a.created_at)}
                {a.sent_by_email ? ` by ${a.sent_by_email}` : ""}
              </DialogDescription>
            </DialogHeader>

            {a.deleted_at ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                Deleted {formatDateTime(a.deleted_at)}
                {a.deleted_by_email ? ` by ${a.deleted_by_email}` : ""}. Hidden from recipients;
                kept here for audit history.
              </p>
            ) : null}

            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-8">
              <div className="flex flex-col gap-4">
                <AnnouncementPreview
                  title={a.title}
                  body={a.body}
                  imageUrl={a.image_url}
                  targetApps={a.target_apps}
                  timestamp={formatDateTime(a.created_at)}
                />
                {hasTemplateTokens(a.title, a.body) ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium">As written</p>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                      <p className="font-semibold">{a.title}</p>
                      <p>{a.body}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-5">
                <Delivery announcement={a} />
                <dl className="divide-y border-t">
                  <Row label="Status">
                    {a.deleted_at ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : (
                      <Badge variant={a.status === "failed" ? "destructive" : "secondary"}>
                        {a.status}
                      </Badge>
                    )}
                  </Row>
                  <Row label="Type">{CATEGORY_LABELS[a.category] ?? a.category}</Row>
                  <Row label="Sent to">{describeAnnouncementTargets(a.target_apps)}</Row>
                  <Row label="Image">{a.image_url ? "Attached" : "None"}</Row>
                </dl>
              </div>
            </div>

            <DialogFooter className="gap-2">
              {a.deleted_at ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive sm:mr-auto"
                  disabled={deleting}
                  onClick={() => onDelete(a)}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="button" disabled={saving} onClick={() => onResend(a)}>
                <RotateCcw data-icon="inline-start" />
                Resend
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
