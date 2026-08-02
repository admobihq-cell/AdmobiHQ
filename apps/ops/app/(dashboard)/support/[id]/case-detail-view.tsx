"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft, Lock, Phone, Send, UserCircle, X } from "lucide-react"
import { toast } from "sonner"

import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  formatLabel,
  type SupportCaseDetailDto,
  type SupportCaseUpdateInput,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { StatusBadge } from "@/components/status-badge"
import { SupportCategoryIcon } from "@/components/support-category-icon"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function CaseDetailView({ caseId }: { caseId: number }) {
  const client = useOpsClient()
  const { user } = useUser()

  const [data, setData] = useState<SupportCaseDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await client.support.get(caseId)
      setData(result)
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [client, caseId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function handleUpdate(
    patch: Pick<SupportCaseUpdateInput, "status" | "priority">,
  ) {
    setUpdating(true)
    try {
      await client.support.update(caseId, patch)
      await load()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setUpdating(false)
    }
  }

  async function assignToMe() {
    if (!user) return
    setUpdating(true)
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: user.id,
        assigned_to_email: user.primaryEmailAddress?.emailAddress ?? null,
      })
      await load()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setUpdating(false)
    }
  }

  async function unassign() {
    setUpdating(true)
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: null,
        assigned_to_email: null,
      })
      await load()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setUpdating(false)
    }
  }

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await client.support.reply(caseId, { body: reply.trim(), internal_note: internalNote })
      setReply("")
      setInternalNote(false)
      await load()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center gap-2 py-24 text-center">
        <p className="text-sm font-medium text-foreground">Case not found.</p>
        <Link href="/support" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to support
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Link
        href="/support"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to support
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {initials(data.contact_name)}
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold tracking-tight">{data.subject}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>#{data.id}</span>
                <span>
                  {data.contact_name} · {data.contact_email}
                </span>
                {data.contact_phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" />
                    {data.contact_phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatLabel(data.channel)}</Badge>
            <Badge variant="outline" className="gap-1">
              <SupportCategoryIcon category={data.category} className="size-3" />
              {formatLabel(data.category)}
            </Badge>
            <StatusBadge status={data.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t pt-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Select
              value={data.status}
              onValueChange={(value) =>
                void handleUpdate({ status: value as SupportCaseUpdateInput["status"] })
              }
              disabled={updating}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_STATUSES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {formatLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Priority</span>
            <Select
              value={data.priority}
              onValueChange={(value) =>
                void handleUpdate({ priority: value as SupportCaseUpdateInput["priority"] })
              }
              disabled={updating}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_PRIORITIES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {formatLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Assignee</span>
            {data.assigned_to_email ? (
              <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 py-1 pr-1 pl-2.5 text-sm">
                <UserCircle className="size-3.5 text-muted-foreground" />
                {data.assigned_to_email}
                <button
                  type="button"
                  onClick={() => void unassign()}
                  disabled={updating}
                  aria-label="Unassign"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => void assignToMe()} disabled={updating}>
                <UserCircle className="size-3.5" />
                Assign to me
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-xl border bg-card p-6">
        {data.messages.map((message, index) => {
          const isCustomer = message.author_type === "customer"
          const prev = data.messages[index - 1]
          const grouped =
            prev !== undefined &&
            prev.author_type === message.author_type &&
            prev.internal_note === message.internal_note

          return (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2.5",
                isCustomer ? "flex-row" : "flex-row-reverse",
                index === 0 ? "mt-0" : grouped ? "mt-1.5" : "mt-4",
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  grouped && "opacity-0",
                  isCustomer ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                )}
                aria-hidden={grouped}
              >
                {isCustomer ? initials(data.contact_name) : "AH"}
              </div>
              <div className={cn("flex max-w-[75%] flex-col gap-1", isCustomer ? "items-start" : "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                    message.internal_note
                      ? "rounded-br-sm flex items-start gap-1.5 border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                      : isCustomer
                        ? "rounded-bl-sm border bg-muted text-foreground"
                        : "rounded-br-sm bg-primary text-primary-foreground",
                  )}
                >
                  {message.internal_note ? (
                    <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
                  ) : null}
                  {message.body}
                </div>
                {!grouped ? (
                  <span className="px-1 text-[11px] text-muted-foreground">
                    {message.internal_note
                      ? "Internal note"
                      : isCustomer
                        ? data.contact_name
                        : (message.author_email ?? "Admobi team")}{" "}
                    · {formatDateTime(message.created_at)}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply…"
          rows={4}
          className={cn(
            internalNote && "border-amber-300 focus-visible:ring-amber-300/50 dark:border-amber-900",
          )}
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={internalNote}
              onCheckedChange={(checked) => setInternalNote(checked === true)}
            />
            Internal note (not visible to customer)
          </label>
          <Button
            onClick={() => void handleSend()}
            disabled={sending || !reply.trim()}
            variant={internalNote ? "outline" : "default"}
            className={cn(
              internalNote &&
                "border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950",
            )}
          >
            {internalNote ? <Lock className="size-4" /> : <Send className="size-4" />}
            {sending ? "Sending…" : internalNote ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}
