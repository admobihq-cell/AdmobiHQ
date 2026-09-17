"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft, Lock, LifeBuoy, Send, UserCircle, X } from "lucide-react"
import { toast } from "sonner"

import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  formatLabel,
  type SupportCaseUpdateInput,
  type SupportMessageCreateInput,
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

import { CaseDetailSkeleton } from "@/components/case-detail-skeleton"
import { StatusBadge } from "@/components/status-badge"
import { SupportCategoryIcon } from "@/components/support-category-icon"
import {
  SectionCard,
  SectionEmpty,
  SectionRow,
  SectionRows,
} from "@/components/ui/section-card"
import { formatDate, formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function ContactLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-primary underline-offset-4 hover:underline">
      {children}
    </a>
  )
}

export function CaseDetailView({ caseId }: { caseId: number }) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const { user } = useUser()

  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)

  const caseQuery = useQuery({
    queryKey: ["ops-support-case", caseId],
    queryFn: () => client.support.get(caseId),
  })
  const data = caseQuery.data ?? null
  const loading = caseQuery.isLoading

  function invalidateCase() {
    void queryClient.invalidateQueries({ queryKey: ["ops-support-case", caseId] })
    void queryClient.invalidateQueries({ queryKey: ["ops-support"] })
  }

  const updateMutation = useMutation({
    mutationFn: (patch: SupportCaseUpdateInput) => client.support.update(caseId, patch),
    onSuccess: invalidateCase,
    onError: (e) => toast.error(formatApiError(e)),
  })
  const updating = updateMutation.isPending

  function handleUpdate(patch: Pick<SupportCaseUpdateInput, "status" | "priority">) {
    updateMutation.mutate(patch)
  }

  function assignToMe() {
    if (!user) return
    updateMutation.mutate({
      assigned_to_clerk_id: user.id,
      assigned_to_email: user.primaryEmailAddress?.emailAddress ?? null,
    })
  }

  function unassign() {
    updateMutation.mutate({ assigned_to_clerk_id: null, assigned_to_email: null })
  }

  const replyMutation = useMutation({
    mutationFn: (body: SupportMessageCreateInput) => client.support.reply(caseId, body),
    onSuccess: () => {
      setReply("")
      setInternalNote(false)
      invalidateCase()
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const sending = replyMutation.isPending

  function handleSend() {
    if (sending || !reply.trim()) return
    replyMutation.mutate({ body: reply.trim(), internal_note: internalNote })
  }

  if (loading) return <CaseDetailSkeleton />

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-20 text-center">
        <LifeBuoy className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Case not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been removed, or the link points at an id that never existed.
        </p>
        <Button variant="outline" asChild className="mt-1">
          <Link href="/support">Back to support</Link>
        </Button>
      </div>
    )
  }

  const lastMessage = data.messages[data.messages.length - 1]

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/support">
            <ArrowLeft aria-hidden />
            <span className="sr-only">Back to support</span>
          </Link>
        </Button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
          {initials(data.contact_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{data.subject}</h1>
          <p className="truncate text-sm text-muted-foreground">
            Case #{data.id} · {data.contact_name} · Opened {formatDate(data.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <SupportCategoryIcon category={data.category} className="size-3" />
            {formatLabel(data.category)}
          </Badge>
          <StatusBadge status={data.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="Conversation" count={data.messages.length} flush>
          {data.messages.length === 0 ? (
            <SectionEmpty>No messages on this case yet.</SectionEmpty>
          ) : (
            <div className="flex flex-col p-4">
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
                        isCustomer
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                      aria-hidden={grouped}
                    >
                      {isCustomer ? initials(data.contact_name) : "AH"}
                    </div>
                    <div
                      className={cn(
                        "flex max-w-[min(75%,34rem)] flex-col gap-1",
                        isCustomer ? "items-start" : "items-end",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line",
                          message.internal_note
                            ? "flex items-start gap-1.5 rounded-br-sm border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                            : isCustomer
                              ? "rounded-bl-sm border bg-muted text-foreground"
                              : "rounded-br-sm bg-primary text-primary-foreground",
                        )}
                      >
                        {message.internal_note ? (
                          <Lock className="mt-1 size-3 shrink-0" aria-hidden />
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
          )}

          <div className="flex flex-col gap-3 border-t p-4">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={internalNote ? "Write an internal note…" : "Write a reply…"}
              rows={4}
              className={cn(
                internalNote &&
                  "border-amber-300 focus-visible:ring-amber-300/50 dark:border-amber-900",
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={internalNote}
                  onCheckedChange={(checked) => setInternalNote(checked === true)}
                />
                Internal note (not visible to customer)
              </label>
              <Button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                loading={sending}
                loadingText="Sending…"
                variant={internalNote ? "outline" : "default"}
                className={cn(
                  internalNote &&
                    "border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950",
                )}
              >
                {internalNote ? <Lock className="size-4" /> : <Send className="size-4" />}
                {internalNote ? "Add note" : "Send reply"}
              </Button>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Case">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <Select
                  value={data.status}
                  onValueChange={(value) =>
                    handleUpdate({ status: value as SupportCaseUpdateInput["status"] })
                  }
                  disabled={updating}
                >
                  <SelectTrigger className="w-full">
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

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <Select
                  value={data.priority}
                  onValueChange={(value) =>
                    handleUpdate({ priority: value as SupportCaseUpdateInput["priority"] })
                  }
                  disabled={updating}
                >
                  <SelectTrigger className="w-full">
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

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Assignee</span>
                {data.assigned_to_email ? (
                  <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 py-1 pr-1 pl-2.5 text-sm">
                    <UserCircle className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{data.assigned_to_email}</span>
                    <button
                      type="button"
                      onClick={unassign}
                      disabled={updating}
                      aria-label="Unassign"
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={assignToMe}
                    disabled={updating}
                  >
                    <UserCircle className="size-4" />
                    Assign to me
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contact" flush>
            <SectionRows>
              <SectionRow label="Name" value={data.contact_name} />
              <SectionRow
                label="Email"
                value={
                  <ContactLink href={`mailto:${data.contact_email}`}>
                    {data.contact_email}
                  </ContactLink>
                }
              />
              <SectionRow
                label="Phone"
                value={
                  data.contact_phone ? (
                    <ContactLink href={`tel:${data.contact_phone}`}>
                      {data.contact_phone}
                    </ContactLink>
                  ) : (
                    "—"
                  )
                }
              />
              <SectionRow label="Channel" value={formatLabel(data.channel)} />
              <SectionRow label="Category" value={formatLabel(data.category)} />
            </SectionRows>
          </SectionCard>

          <SectionCard title="Timeline" flush>
            <SectionRows>
              <SectionRow label="Opened" value={formatDateTime(data.created_at)} />
              <SectionRow label="Last updated" value={formatDateTime(data.updated_at)} />
              <SectionRow
                label="Last message"
                value={lastMessage ? formatDateTime(lastMessage.created_at) : "—"}
              />
            </SectionRows>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
