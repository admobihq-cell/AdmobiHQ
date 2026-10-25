"use client"

import Link from "next/link"
import type { FormEvent } from "react"
import { useState } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { publicApiFetch } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { SubmissionSuccess } from "@/components/forms/submission-success"

import { Container } from "./container"
import { ChevronPattern, FlowLinesPattern } from "./pattern-shapes"
import { LIVE_CITY, nextCitiesList } from "./rollout"

/** Waitlist fields sit on the muted panel, so they take the page colour to read as inputs. */
const fieldClass = "h-10 bg-background px-3 text-sm dark:bg-background"

export function GetStartedSection() {
  const [email, setEmail] = useState("")
  const [persona, setPersona] = useState("")
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
      body: JSON.stringify({
        email,
        ...(persona ? { persona } : {}),
      }),
    })
    if (!result.ok) {
      setErrorMessage(result.message)
      setStatus("error")
      return
    }
    setStatus("success")
  }

  function handleReset() {
    setEmail("")
    setPersona("")
    setErrorMessage(null)
    setStatus("idle")
  }

  return (
    <section id="get-started" className="scroll-mt-20 py-14 sm:py-20 lg:py-24">
      <Container className="max-w-[min(100%,88rem)]">
        <h2 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
          Get started
        </h2>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="relative isolate flex min-h-[19rem] flex-col overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10 lg:min-h-[22rem] lg:p-12">
            <FlowLinesPattern
              maskImage="radial-gradient(ellipse 70% 90% at 100% 0%, black, transparent 70%)"
              colorClassName="text-primary-foreground/40"
            />
            <h3 className="max-w-[16ch] text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.25rem]">
              Put your brand on {LIVE_CITY} taxis
            </h3>
            <p className="mt-4 max-w-[44ch] leading-relaxed opacity-90">
              Taxi tops and delivery bikes, any budget, from a one-day test up. Tell us the goal and
              we plan the areas and hours with you.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-auto self-start bg-primary-foreground text-primary hover:bg-primary-foreground/90 max-lg:mt-8"
            >
              <Link href="/start-campaign">Start a campaign</Link>
            </Button>
          </div>

          <div className="relative isolate flex min-h-[19rem] flex-col overflow-hidden rounded-2xl bg-foreground p-8 text-background sm:p-10 lg:min-h-[22rem] lg:p-12">
            <ChevronPattern
              maskImage="radial-gradient(ellipse 70% 90% at 100% 0%, black, transparent 70%)"
              colorClassName="text-background/50"
            />
            <h3 className="max-w-[16ch] text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.25rem]">
              Earn on the routes you already drive
            </h3>
            <p className="mt-4 max-w-[44ch] leading-relaxed opacity-85">
              Register your taxis or bikes. We install the screens and sell the media; you keep your
              routes and dispatch.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-auto self-start bg-background text-foreground hover:bg-background/90 max-lg:mt-8"
            >
              <Link href="/partner-fleet">Partner your fleet</Link>
            </Button>
          </div>
        </div>

        {/* Third row of the same card system: one quiet panel for everyone who isn't an
            advertiser or a fleet, split on the line between the two cards above. */}
        <div className="mt-4 grid overflow-hidden rounded-2xl bg-muted lg:grid-cols-2">
          <div className="flex flex-col p-8 sm:p-10 lg:px-12">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              Driving your own taxi?
            </h3>
            <p className="mt-1.5 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
              Carry a screen on your own taxi or bike and get paid monthly. Just drive as usual.
            </p>
            {/* Bottom-aligned with the waitlist form row, as the door cards pin their buttons. */}
            <Button
              asChild
              className="group mt-auto h-10 self-start bg-foreground px-4 text-background hover:bg-foreground/85 max-lg:mt-5"
            >
              <Link href="/drivers">
                Apply as a driver
                <ArrowRight
                  className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>
            </Button>
          </div>

          <div
            id="waitlist"
            className="scroll-mt-20 border-t border-border p-8 sm:p-10 lg:border-t-0 lg:border-l lg:px-12"
          >
            {status === "success" ? (
              <SubmissionSuccess
                title="You're on the list"
                steps={[
                  { label: "Subscribed", when: "Just now" },
                  { label: "We email only when there's real network news: new cities, launches, milestones. Nothing in between." },
                ]}
                onReset={handleReset}
              />
            ) : (
              <form className="flex flex-col" onSubmit={onNotify} noValidate>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  Hear when we launch near you
                </h3>
                <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
                  We only email when a new city goes live or the network changes. Next up:{" "}
                  {nextCitiesList}.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Label htmlFor="notify-email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="notify-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@company.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading"}
                    className={`${fieldClass} sm:min-w-0 sm:flex-1`}
                    aria-invalid={!!errorMessage}
                    aria-describedby={errorMessage ? "notify-email-error" : undefined}
                  />
                  <Select value={persona} onValueChange={setPersona} disabled={status === "loading"}>
                    <SelectTrigger
                      aria-label="I am a"
                      className={`${fieldClass} w-full data-[size=default]:h-10 sm:w-40 sm:shrink-0`}
                    >
                      <SelectValue placeholder="I am a…" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl p-1">
                      <SelectItem value="advertiser">Advertiser</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="fleet">Fleet operator</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    disabled={status === "loading"}
                    className="h-10 bg-foreground px-4 text-background hover:bg-foreground/85 sm:shrink-0"
                  >
                    {status === "loading" ? "Sending…" : "Notify me"}
                  </Button>
                </div>
                {errorMessage ? (
                  <div id="notify-email-error">
                    <ApiErrorBanner
                      message={errorMessage}
                      onDismiss={() => {
                        setErrorMessage(null)
                        setStatus("idle")
                      }}
                    />
                  </div>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
