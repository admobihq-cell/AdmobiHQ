"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Send, SearchX } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { SupportStatusBadge } from "@/components/support-status-badge"
import { getSupportCase, replyToSupportCase, type SupportMessage } from "@/lib/support-client"
import { CategoryIcon, getCategoryLabel } from "@/lib/support-categories"

const POLL_INTERVAL_MS = 15_000

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function CaseThreadClient({ caseId }: { caseId: number }) {
  const [subject, setSubject] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [contactName, setContactName] = useState<string>("You")
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(caseId)) return
    const data = await getSupportCase(caseId)
    if (data) {
      setSubject(data.subject)
      setStatus(data.status)
      setCategory(data.category)
      setCreatedAt(data.created_at)
      setContactName(data.contact_name)
      setMessages(data.messages)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }, [caseId])

  useEffect(() => {
    // Initial fetch plus poll — syncing from the API, an external system, is
    // exactly what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await replyToSupportCase(caseId, reply.trim())
      setReply("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your reply.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link
        href="/settings/support"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to requests
      </Link>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-2/3 rounded-md" />
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <Skeleton className="ml-auto h-10 w-2/3 rounded-lg" />
            <Skeleton className="h-10 w-3/4 rounded-lg" />
          </div>
        </div>
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
                        "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                        isCustomer
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
              className="group self-end"
            >
              <Send
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
              {sending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
