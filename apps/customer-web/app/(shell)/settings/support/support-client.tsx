"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, Inbox } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { SupportStatusBadge } from "@/components/support-status-badge"
import { useCustomerSession } from "@/lib/auth/customer-session"
import {
  createSupportCase,
  getStoredIdentity,
  listMySupportCases,
  type SupportCase,
} from "@/lib/support-client"
import { CategoryIcon, SUPPORT_CATEGORIES } from "@/lib/support-categories"

export function SupportClient() {
  const session = useCustomerSession()

  const [cases, setCases] = useState<SupportCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number]["value"]>(
    "general",
  )
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
      void refreshCases()
    } else {
      setLoadingCases(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status])

  async function refreshCases() {
    setLoadingCases(true)
    try {
      const items = await listMySupportCases()
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
      await refreshCases()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Help &amp; contact</h1>
        <p className="text-sm text-muted-foreground">
          Reach the Admobi team about billing, campaigns, or anything else — we
          usually reply within one business day.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>New request</CardTitle>
            <CardDescription>
              We&apos;ll email you at the address below when the team replies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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

              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-0.5 text-sm font-medium text-foreground">Category</legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {SUPPORT_CATEGORIES.map(({ value, label, icon: Icon }) => {
                    const active = category === value
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategory(value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors",
                          active
                            ? "border-primary bg-primary/[0.06] text-primary"
                            : "border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4.5" strokeWidth={2} aria-hidden />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

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

        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            My requests
          </h2>

          {loadingCases ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-5">
              <Inbox className="size-4.5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Requests you send will show up here on this device.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cases.map((item) => (
                <Link
                  key={item.id}
                  href={`/settings/support/${item.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3.5 text-sm transition-colors hover:border-foreground/20 hover:bg-accent"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <CategoryIcon value={item.category} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      #{item.id} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <SupportStatusBadge status={item.status} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
