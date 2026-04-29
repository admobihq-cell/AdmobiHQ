"use client"

import type { FormEvent } from "react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { Container } from "./container"

export function MediaKitSection() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError("Enter your email.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Use a valid email address.")
      return
    }
    setOk(true)
    console.info("[Admobi media kit]", email)
  }

  return (
    <section
      id="media-kit"
      className="scroll-mt-24 border-b border-border py-14 sm:py-20"
    >
      <Container>
        <div className="grid gap-8 rounded-2xl border border-border bg-muted/30 p-8 sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              Media kit
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Specs on hardware, creative pixels, illustrative reach bands, and story angles you can reuse in briefs.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Replace the demo submission with an attached PDF link or gated storage when assets are finalized.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <form className="grid gap-4" onSubmit={submit} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="media-email">Email for link</Label>
                <Input
                  id="media-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "media-email-error" : undefined}
                />
                {error ? (
                  <p
                    id="media-email-error"
                    className="text-destructive text-xs font-medium"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
              <Button type="submit" size="lg">
                Download media kit
              </Button>
            </form>
            {ok ? (
              <p className="text-foreground text-sm" role="status">
                Thanks. Wire this to email automation or drop a PDF in `/public/media-kit/` when ready.
              </p>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}
