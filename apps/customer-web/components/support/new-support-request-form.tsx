"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { useCustomerSession } from "@/lib/auth/customer-session"
import { createSupportCase, getStoredIdentity } from "@/lib/support-client"
import { CategoryIcon, SUPPORT_CATEGORIES } from "@/lib/support-categories"

export function NewSupportRequestForm({
  onCreated,
}: {
  onCreated: (caseId: number) => void
}) {
  const session = useCustomerSession()
  const identity = getStoredIdentity()

  const [name, setName] = useState(identity?.name ?? "")
  const [email, setEmail] = useState(identity?.email ?? "")
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number]["value"]>(
    "general",
  )
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
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
      toast.success(`Request sent — case #${created.id}`)
      onCreated(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4"
    >
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

      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? "Sending…" : "Send request"}
      </Button>
    </form>
  )
}
