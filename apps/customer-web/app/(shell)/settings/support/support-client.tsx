"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import { useCustomerSession } from "@/lib/auth/customer-session"
import {
  createSupportCase,
  getStoredIdentity,
  listMySupportCases,
  type SupportCase,
} from "@/lib/support-client"

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "billing", label: "Billing" },
  { value: "campaign", label: "Campaign" },
  { value: "technical", label: "Technical" },
  { value: "driver", label: "Driver" },
]

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Awaiting you",
  resolved: "Resolved",
  closed: "Closed",
}

export function SupportClient() {
  const session = useCustomerSession()

  const [cases, setCases] = useState<SupportCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("general")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session.status !== "anonymous") return
    // Hydrating form defaults from localStorage — an external system — is
    // exactly what this effect is for; it can only run client-side, once,
    // after the session hook resolves.
    const identity = getStoredIdentity()
    if (identity) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(identity.name)
      setEmail(identity.email)
      void refreshCases(identity.email)
    } else {
      setLoadingCases(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status])

  async function refreshCases(forEmail: string) {
    if (session.status !== "anonymous") return
    setLoadingCases(true)
    try {
      const items = await listMySupportCases(forEmail, session.deviceId)
      setCases(items)
    } finally {
      setLoadingCases(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || session.status !== "anonymous") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    try {
      const created = await createSupportCase({
        contact_name: name.trim(),
        contact_email: email.trim(),
        anonymous_device_id: session.deviceId,
        category,
        subject: subject.trim(),
        message: message.trim(),
      })
      setSubject("")
      setMessage("")
      toast.success(`Request sent — case #${created.id}`)
      await refreshCases(email.trim())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>New request</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="support-name">Your name</Label>
                <Input
                  id="support-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="support-email">Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's going on"
                rows={5}
              />
            </div>

            <Button type="submit" disabled={submitting} className="self-start">
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          My requests
        </h2>
        {loadingCases ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Requests you send will show up here on this device.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cases.map((item) => (
              <Link
                key={item.id}
                href={`/settings/support/${item.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 text-sm transition-colors hover:bg-accent"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{item.subject}</span>
                  <span className="text-xs text-muted-foreground">#{item.id}</span>
                </div>
                <Badge variant="secondary">{STATUS_LABELS[item.status] ?? item.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
