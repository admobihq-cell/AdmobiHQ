"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft, Loader2, Send } from "lucide-react"
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
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

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
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to support
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{data.subject}</h1>
            <p className="text-sm text-muted-foreground">
              #{data.id} · {data.contact_name} ({data.contact_email})
              {data.contact_phone ? ` · ${data.contact_phone}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatLabel(data.channel)}</Badge>
            <Badge variant="outline">{formatLabel(data.category)}</Badge>
            <StatusBadge status={data.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2">
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

          <div className="ml-auto flex items-center gap-2">
            {data.assigned_to_email ? (
              <>
                <span className="text-xs text-muted-foreground">
                  Assigned to {data.assigned_to_email}
                </span>
                <Button variant="outline" size="sm" onClick={() => void unassign()} disabled={updating}>
                  Unassign
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => void assignToMe()} disabled={updating}>
                Assign to me
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
        {data.messages.map((message) => {
          const isCustomer = message.author_type === "customer"
          return (
            <div
              key={message.id}
              className={cn("flex flex-col gap-1", isCustomer ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.internal_note
                    ? "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : isCustomer
                      ? "border bg-muted text-foreground"
                      : "bg-primary text-primary-foreground",
                )}
              >
                {message.body}
              </div>
              <span className="text-xs text-muted-foreground">
                {message.internal_note
                  ? "Internal note"
                  : isCustomer
                    ? data.contact_name
                    : (message.author_email ?? "Admobi team")}{" "}
                · {formatDateTime(message.created_at)}
              </span>
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
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={internalNote}
              onCheckedChange={(checked) => setInternalNote(checked === true)}
            />
            Internal note (not visible to customer)
          </label>
          <Button onClick={() => void handleSend()} disabled={sending || !reply.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {internalNote ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}
