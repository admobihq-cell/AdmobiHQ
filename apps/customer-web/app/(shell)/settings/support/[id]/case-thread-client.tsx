"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { getSupportCase, replyToSupportCase, type SupportMessage } from "@/lib/support-client"

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Awaiting you",
  resolved: "Resolved",
  closed: "Closed",
}

const POLL_INTERVAL_MS = 15_000

export function CaseThreadClient({ caseId }: { caseId: number }) {
  const [subject, setSubject] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
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
      setMessages(data.messages)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }, [caseId])

  useEffect(() => {
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/settings/support"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to requests
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notFound ? (
        <p className="text-sm text-muted-foreground">
          This request isn&apos;t available on this device.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">{subject}</h1>
            {status ? <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge> : null}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            {messages.map((message) => {
              const isCustomer = message.author_type === "customer"
              return (
                <div
                  key={message.id}
                  className={cn("flex flex-col gap-1", isCustomer ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      isCustomer
                        ? "bg-primary text-primary-foreground"
                        : "border bg-muted text-foreground",
                    )}
                  >
                    {message.body}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isCustomer ? "You" : "Admobi team"} ·{" "}
                    {new Date(message.created_at).toLocaleString()}
                  </span>
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
            <Button onClick={handleSend} disabled={sending || !reply.trim()} className="self-end">
              {sending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
