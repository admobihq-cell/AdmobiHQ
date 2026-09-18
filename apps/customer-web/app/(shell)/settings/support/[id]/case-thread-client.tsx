"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, Send, SearchX } from "lucide-react"
import { toast } from "sonner"

import { formatDate } from "@workspace/ops-contracts/format"
import { refetchIntervalWhileActive } from "@workspace/query-client"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { ChatThreadSkeleton } from "@/components/skeletons/chat-thread-skeleton"
import { SupportStatusBadge } from "@/components/support-status-badge"
import { getSupportCase, replyToSupportCase, type SupportMessage } from "@/lib/support-client"
import { CategoryIcon, getCategoryLabel } from "@/lib/support-categories"

const POLL_INTERVAL_MS = 60_000
/** Once a case is resolved/closed there's nothing left to poll for — stop
 * touching the DB rather than hold the compute awake every minute. */
const SETTLED_STATUSES = new Set(["resolved", "closed"])

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function messageTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function CaseThreadClient({ caseId }: { caseId: number }) {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const [reply, setReply] = useState("")

  const caseQuery = useQuery({
    queryKey: ["customer-support-case", caseId],
    queryFn: async () => getSupportCase(caseId, await getToken()),
    enabled: Number.isFinite(caseId),
    refetchInterval: refetchIntervalWhileActive(
      POLL_INTERVAL_MS,
      (data) => data != null && SETTLED_STATUSES.has(data.status),
    ),
  })
  const loading = caseQuery.isLoading
  const notFound = !caseQuery.isLoading && caseQuery.data === null
  const subject = caseQuery.data?.subject ?? null
  const status = caseQuery.data?.status ?? null
  const category = caseQuery.data?.category ?? null
  const createdAt = caseQuery.data?.created_at ?? null
  const contactName = caseQuery.data?.contact_name ?? "You"
  const messages: SupportMessage[] = caseQuery.data?.messages ?? []
  const settled = status != null && SETTLED_STATUSES.has(status)

  const replyMutation = useMutation({
    mutationFn: async (body: string) => replyToSupportCase(caseId, body, await getToken()),
    onSuccess: () => {
      setReply("")
      void queryClient.invalidateQueries({ queryKey: ["customer-support-case", caseId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send your reply."),
  })
  const sending = replyMutation.isPending

  function handleSend() {
    if (sending || !reply.trim()) return
    replyMutation.mutate(reply.trim())
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Link
        href="/settings/support"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to requests
      </Link>

      {loading ? (
        <ChatThreadSkeleton />
      ) : notFound ? (
        <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <SearchX className="size-6 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium">This request isn&apos;t available here</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Requests are tied to the device they were sent from. Open it on that device, or send
              a new one and we&apos;ll pick up the thread.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-1">
            <Link href="/settings/support/new">New request</Link>
          </Button>
        </div>
      ) : (
        <div className="flex w-full max-w-2xl flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{subject}</h1>
              {status ? <SupportStatusBadge status={status} /> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {category ? <CategoryIcon value={category} className="size-3.5" /> : null}
              <span>{category ? getCategoryLabel(category) : ""}</span>
              <span aria-hidden>·</span>
              <span>#{caseId}</span>
              {createdAt ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Opened {formatDate(createdAt)}</span>
                </>
              ) : null}
            </div>
          </div>

          <Card className="gap-0 py-0 shadow-none">
            <CardContent className="flex flex-col p-4">
              {messages.map((message, index) => {
                const isCustomer = message.author_type === "customer"
                const prev = messages[index - 1]
                const grouped = prev?.author_type === message.author_type
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end gap-2",
                      isCustomer ? "flex-row-reverse" : "flex-row",
                      index === 0 ? "mt-0" : grouped ? "mt-1.5" : "mt-4",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        grouped && "opacity-0",
                        isCustomer
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-hidden={grouped}
                    >
                      {isCustomer ? initials(contactName) : "AH"}
                    </div>
                    <div
                      className={cn(
                        "flex max-w-[78%] flex-col gap-1",
                        isCustomer ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line",
                          isCustomer
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm border bg-muted text-foreground",
                        )}
                      >
                        {message.body}
                      </div>
                      {!grouped ? (
                        <span className="px-1 text-[11px] text-muted-foreground">
                          {isCustomer ? "You" : "Admobi team"} · {messageTime(message.created_at)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </CardContent>

            <div className="flex flex-col gap-3 border-t p-4">
              {settled ? (
                <p className="text-xs text-muted-foreground">
                  This request is {status}. Replying reopens it for the team.
                </p>
              ) : null}
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={settled ? "Add anything else…" : "Write a reply…"}
                rows={3}
              />
              <Button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                loading={sending}
                loadingText="Sending…"
                className="group self-end"
              >
                <Send
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
                {settled ? "Reply and reopen" : "Send reply"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
