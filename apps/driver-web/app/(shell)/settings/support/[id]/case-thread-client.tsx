"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { ArrowLeft, Send, SearchX } from "lucide-react"
import { toast } from "sonner"

import { refetchIntervalWhenVisible } from "@workspace/query-client"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { ChatThreadSkeleton } from "@/components/skeletons/chat-thread-skeleton"
import { SupportStatusBadge } from "@/components/support-status-badge"
import { getSupportCase, replyToSupportCase, type SupportMessage } from "@/lib/support-client"
import { CategoryIcon, getCategoryLabel } from "@/lib/support-categories"

const POLL_INTERVAL_MS = 30_000

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function CaseThreadClient({ caseId }: { caseId: number }) {
  const queryClient = useQueryClient()
  const [reply, setReply] = useState("")

  const caseQuery = useQuery({
    queryKey: ["driver-support-case", caseId],
    queryFn: () => getSupportCase(caseId),
    enabled: Number.isFinite(caseId),
    refetchInterval: refetchIntervalWhenVisible(POLL_INTERVAL_MS),
  })
  const loading = caseQuery.isLoading
  const notFound = !caseQuery.isLoading && caseQuery.data === null
  const subject = caseQuery.data?.subject ?? null
  const status = caseQuery.data?.status ?? null
  const category = caseQuery.data?.category ?? null
  const createdAt = caseQuery.data?.created_at ?? null
  const contactName = caseQuery.data?.contact_name ?? "You"
  const messages: SupportMessage[] = caseQuery.data?.messages ?? []

  const replyMutation = useMutation({
    mutationFn: (body: string) => replyToSupportCase(caseId, body),
    onSuccess: () => {
      setReply("")
      void queryClient.invalidateQueries({ queryKey: ["driver-support-case", caseId] })
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
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to requests
      </Link>

      {loading ? (
        <ChatThreadSkeleton />
      ) : notFound ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
          <SearchX className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            This request isn&apos;t available on this device.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 border-b border-border pb-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{subject}</h1>
              {status ? <SupportStatusBadge status={status} /> : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {category ? <CategoryIcon value={category} className="size-3.5" /> : null}
              <span>{category ? getCategoryLabel(category) : ""}</span>
              {createdAt ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Opened {new Date(createdAt).toLocaleDateString()}</span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>#{caseId}</span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border bg-card p-4">
            {messages.map((message, index) => {
              const isDriver = message.author_type === "customer"
              const prev = messages[index - 1]
              const grouped = prev?.author_type === message.author_type
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isDriver ? "flex-row-reverse" : "flex-row",
                    index === 0 ? "mt-0" : grouped ? "mt-1.5" : "mt-4",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      grouped && "opacity-0",
                      isDriver
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden={grouped}
                  >
                    {isDriver ? initials(contactName) : "AH"}
                  </div>
                  <div
                    className={cn(
                      "flex max-w-[78%] flex-col gap-1",
                      isDriver ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                        isDriver
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm border bg-muted text-foreground",
                      )}
                    >
                      {message.body}
                    </div>
                    {!grouped ? (
                      <span className="px-1 text-[11px] text-muted-foreground">
                        {new Date(message.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
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
              Send reply
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
