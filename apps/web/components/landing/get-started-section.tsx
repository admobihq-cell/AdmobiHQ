"use client"

import Link from "next/link"
import type { FormEvent } from "react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { publicApiFetch } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"

import { Container } from "./container"

export function GetStartedSection() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onNotify(e: FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage(null)
    const result = await publicApiFetch<{ success?: boolean }>("/waitlist", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
    if (!result.ok) {
      setErrorMessage(result.message)
      setStatus("error")
      return
    }
    setStatus("success")
  }

  return (
    <section id="get-started" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Get started
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Choose the path that fits.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:col-span-1">
            <h3 className="text-lg font-semibold text-foreground">Start a campaign</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
              Run ads on taxi tops and delivery bikes across Nairobi, Mombasa, and Kisumu. Any
              budget. Any duration.
            </p>
            <Button asChild className="mt-6 w-full sm:w-auto" size="lg">
              <Link href="/start-campaign">Talk to us</Link>
            </Button>
          </div>

          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:col-span-1">
            <h3 className="text-lg font-semibold text-foreground">Partner your fleet</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
              Register your taxis or bikes and earn consistent revenue on every route you already
              drive.
            </p>
            <Button asChild className="mt-6 w-full sm:w-auto" size="lg" variant="outline">
              <Link href="/partner-fleet">Join as partner</Link>
            </Button>
          </div>

          <div className="flex flex-col rounded-xl border border-border bg-muted/25 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-foreground">Drive with Admobi</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
              Individual driver? See working terms, hardware details, and apply to carry our
              screens.
            </p>
            <Button asChild className="mt-5 w-full sm:w-auto" variant="ghost" size="sm">
              <Link href="/drivers">See driver info</Link>
            </Button>
          </div>
        </div>

        <form
          id="waitlist"
          className="mt-14 max-w-xl scroll-mt-20 space-y-4 border-t border-border pt-10"
          onSubmit={onNotify}
          noValidate
        >
          <Label htmlFor="notify-email" className="text-foreground">
            Stay updated on city launches and network news.
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Input
              id="notify-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading" || status === "success"}
              className="sm:min-w-0 sm:flex-1"
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? "notify-email-error" : undefined}
            />
            <Button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="sm:shrink-0"
            >
              {status === "loading" ? "Sending…" : "Notify me"}
            </Button>
          </div>
          {errorMessage ? (
            <ApiErrorBanner
              message={errorMessage}
              onDismiss={() => {
                setErrorMessage(null)
                setStatus("idle")
              }}
            />
          ) : null}
          {status === "success" ? (
            <p className="text-foreground text-sm" role="status">
              You are on the list. We will only email when we have real network news.
            </p>
          ) : null}
        </form>
      </Container>
    </section>
  )
}
