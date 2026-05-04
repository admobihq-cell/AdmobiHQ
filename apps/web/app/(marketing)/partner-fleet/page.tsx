"use client"

import Link from "next/link"
import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ClipboardList, Cpu, Smartphone, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { FleetLeadInput } from "@/lib/validation/lead-schemas"
import { fleetLeadSchema } from "@/lib/validation/lead-schemas"

import { Container } from "@/components/landing/container"

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 md:text-sm disabled:opacity-50"

const heroSteps = [
  {
    title: "Apply",
    detail:
      "Submit the form below with fleet scale, cities, and vehicle mix. Our partnership team qualifies fit before rollout.",
    icon: ClipboardList,
  },
  {
    title: "Partnership review",
    detail:
      "We respond within 48 hours with onboarding steps, install windows, and commercial terms framed for your fleet size.",
    icon: Smartphone,
  },
  {
    title: "We install fleet-wide",
    detail:
      "Certified technicians fit LED taxi-tops or delivery-bike enclosures on schedule. Typical single-vehicle work stays under ~2 hours. Hardware stays with Admobi.",
    icon: Cpu,
  },
  {
    title: "Earn per vehicle",
    detail:
      "Revenue settles monthly per contracted vehicle tied to verified screen hours when your network is on the road in agreement with your plan.",
    icon: Wallet,
  },
] as const

const termsCards = [
  {
    heading: "Commercial terms",
    body: "Rates, revenue share, and reporting cadence are confirmed in your partnership agreement or commercial letter. Nairobi-first coverage expands city by city.",
  },
  {
    heading: "Hardware ownership",
    body: "Admobi installs, owns, and maintains units for normal wear. You do not purchase hardware outright. Faulty units under ordinary use get swapped according to SLA.",
  },
  {
    heading: "Operations workload",
    body: "Admobi operates content scheduling and playback remotely. Fleet partners focus on roadworthy vehicles and access for technicians, not ads management.",
  },
  {
    heading: "Fleet readiness",
    body: "Vehicles should carry valid insurance, licensing, and an operations contact with authority to approve install slots and safety checks.",
  },
  {
    heading: "Brand and content rules",
    body: "All campaigns pass Admobi review against brand-safety posture. Sensitive categories may need extra approvals for your jurisdiction.",
  },
  {
    heading: "Exit and removal",
    body: "Wind-down timelines and hardware collection follow your agreement. Typical notice windows are spelled out upfront so fleets can rebalance routing.",
  },
  {
    heading: "GPS and verification data",
    body: "Location proof-of-play informs billing and advertiser reporting. Passenger or driver-facing personal data stays out of advertiser exports unless contractually scoped.",
  },
] as const

const eligibility = [
  "Fleet or aggregation brand with taxis, delivery bikes, or both in Kenya rollout cities today",
  "Primary contact authorised to approve installs across operating yards or partners",
  "Minimum practical batch size communicated honestly (we will advise if you are early)",
  "Roadworthy vehicles with current insurance and compliance proof on request",
  "WhatsApp or phone line for day-of coordination with field technicians",
]

const fleetFaqItems = [
  {
    q: "Do we buy the hardware?",
    answer:
      "No. Admobi funds purchase, install, and replacement for covered faults. Your commercial upside is in the partnership revenue model, not capex on screens.",
  },
  {
    q: "How fast can we light up a second city?",
    answer:
      "Once Nairobi density is healthy, Nakuru, Eldoret, and Mombasa follow in the Kenya rollout plan. Multi-city books are scheduled when inventory and compliance line up.",
  },
  {
    q: "Who handles driver complaints about ads?",
    answer:
      "Escalate to Admobi operations. We triage brand-safety flags and can pause units if a creative breaches your comfort settings.",
  },
  {
    q: "What if vehicles sit idle during low season?",
    answer:
      "Contracts define how idle time affects revenue. Your partnership manager models realistic utilisation before sign-off so expectations stay honest.",
  },
] as const

export default function PartnerFleetPage() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<FleetLeadInput>({
    resolver: zodResolver(fleetLeadSchema),
    defaultValues: {
      audience: "fleet",
      fleetOrCompanyName: "",
      primaryContactName: "",
      email: "",
      phone: "",
      city: "Nairobi",
      fleetTypes: [],
      vehicleCount: 1,
      vehiclesActive: "yes",
      notes: "",
      consent: false,
    },
  })

  const { register, handleSubmit, setValue, watch, formState } = form
  const fleetTypesWatch = watch("fleetTypes").slice()
  const radioClass = "border-input accent-primary size-4 shrink-0 rounded-full border"

  function toggleFleetType(key: "taxi" | "delivery_bike") {
    const curr = fleetTypesWatch.slice()
    const next = curr.includes(key) ? curr.filter((v) => v !== key) : [...curr, key]
    setValue("fleetTypes", next, { shouldValidate: true })
  }

  function setBothFleetTypes() {
    setValue(
      "fleetTypes",
      fleetTypesWatch.length === 2 &&
        fleetTypesWatch.includes("taxi") &&
        fleetTypesWatch.includes("delivery_bike")
        ? []
        : ["taxi", "delivery_bike"],
      { shouldValidate: true },
    )
  }

  async function onSubmit(data: FleetLeadInput) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = (await res.json()) as { success?: boolean }
    if (!res.ok) return
    if (json.success) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] border-b border-border py-14 sm:py-20">
        <Container className="max-w-3xl space-y-4">
          <p className="text-foreground text-xl font-semibold leading-snug sm:text-2xl">
            Thanks. We&apos;ll send over the partnership deck and follow up within 48 hours.
          </p>
        </Container>
      </div>
    )
  }

  return (
    <div className="border-b border-border pb-14 sm:pb-20">
      <section className="border-border border-b bg-foreground text-background py-14 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-2xl space-y-6">
            <div className="space-y-3">
              <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                Fleet partnership · Kenya rollout
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                Monetise every vehicle you already run
              </h1>
              <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed sm:text-xl">
                Register taxis or delivery bikes with Admobi. We install connected screens, sell the media, and share
                revenue while you keep routes and dispatch your own way.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
              <Link href="#request-deck">Request partnership deck</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Here&apos;s how it works
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {heroSteps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="space-y-3">
                  <div className="bg-muted/40 text-foreground flex size-11 items-center justify-center rounded-xl border border-border">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.detail}</p>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            What you need to know
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {termsCards.map((card) => (
              <div
                key={card.heading}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6"
              >
                <h3 className="text-base font-semibold text-foreground">{card.heading}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Who fits first
          </h2>
          <ul className="mt-8 max-w-xl space-y-4">
            {eligibility.map((item) => (
              <li key={item} className="flex gap-3 text-base text-foreground">
                <span className="text-primary mt-0.5 shrink-0">
                  <Check className="size-5" aria-hidden />
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Partnership FAQ
          </h2>
          <div className="mt-8 divide-y divide-border border-t border-border">
            {fleetFaqItems.map((item) => (
              <details key={item.q} className="group py-2">
                <summary className="cursor-pointer list-none py-4 text-base font-medium text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-muted-foreground text-xl font-normal transition-transform duration-200 ease-out group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="text-muted-foreground max-w-[65ch] pb-4 pl-0 text-sm leading-relaxed sm:text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section id="request-deck" className="scroll-mt-24 border-border border-t py-14 sm:py-20">
        <Container>
          <div className="max-w-xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Request partnership deck
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Share operational basics. Expect a structured follow-up inside two business days.
            </p>
          </div>

          <form className="mt-10 max-w-xl space-y-8" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="pf-co">Fleet or company name *</Label>
              <Input
                id="pf-co"
                {...register("fleetOrCompanyName")}
                aria-invalid={!!formState.errors.fleetOrCompanyName}
              />
              {formState.errors.fleetOrCompanyName ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {formState.errors.fleetOrCompanyName.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pf-name">Primary contact name *</Label>
              <Input
                id="pf-name"
                {...register("primaryContactName")}
                aria-invalid={!!formState.errors.primaryContactName}
              />
              {formState.errors.primaryContactName ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {formState.errors.primaryContactName.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pf-email">Email *</Label>
              <Input id="pf-email" type="email" autoComplete="email" {...register("email")} />
              {formState.errors.email ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pf-phone">Phone / WhatsApp *</Label>
              <Input id="pf-phone" type="tel" autoComplete="tel" {...register("phone")} />
              {formState.errors.phone ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {formState.errors.phone.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pf-city">City of operation *</Label>
              <select id="pf-city" className={selectClass} {...register("city")}>
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kisumu">Kisumu</option>
              </select>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-3 text-sm font-medium text-foreground">Fleet type *</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={fleetTypesWatch.includes("taxi")}
                    onChange={() => toggleFleetType("taxi")}
                    className="border-input accent-primary size-4 rounded border"
                  />
                  <span>Taxis</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={fleetTypesWatch.includes("delivery_bike")}
                    onChange={() => toggleFleetType("delivery_bike")}
                    className="border-input accent-primary size-4 rounded border"
                  />
                  <span>Delivery bikes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={
                      fleetTypesWatch.includes("taxi") &&
                      fleetTypesWatch.includes("delivery_bike")
                    }
                    onChange={setBothFleetTypes}
                    className="border-input accent-primary size-4 rounded border"
                  />
                  <span>Both</span>
                </label>
              </div>
              {formState.errors.fleetTypes ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {formState.errors.fleetTypes.message as string}
                </p>
              ) : null}
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="pf-count">Number of vehicles available *</Label>
              <Input
                id="pf-count"
                type="number"
                min={1}
                step={1}
                {...register("vehicleCount", { valueAsNumber: true })}
              />
              {formState.errors.vehicleCount ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {formState.errors.vehicleCount.message}
                </p>
              ) : null}
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-medium text-foreground">
                Are vehicles currently active? *
              </legend>
              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="radio" value="yes" className={radioClass} {...register("vehiclesActive")} />
                  Yes
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="radio" value="no" className={radioClass} {...register("vehiclesActive")} />
                  No
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="radio" value="some" className={radioClass} {...register("vehiclesActive")} />
                  Some
                </label>
              </div>
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="pf-notes">Additional notes (optional)</Label>
              <textarea
                id="pf-notes"
                rows={3}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring flex min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
                {...register("notes")}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="border-input accent-primary mt-1 size-4 shrink-0 rounded border"
                {...register("consent")}
              />
              <span>
                I agree to the{" "}
                <Link href="#" className="text-primary underline-offset-4 hover:underline">
                  privacy policy
                </Link>{" "}
                and understand these are the working terms described above.
              </span>
            </label>
            {formState.errors.consent ? (
              <p className="text-destructive text-xs font-medium" role="alert">
                {formState.errors.consent.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={formState.isSubmitting} size="lg">
              {formState.isSubmitting ? "Sending…" : "Request partnership deck"}
            </Button>
          </form>

          <p className="text-muted-foreground mt-10 max-w-2xl text-xs leading-relaxed">
            Admobi contracts with licensed fleet partners. Final economics sit in your signed agreement, not on this
            marketing page.
          </p>
        </Container>
      </section>
    </div>
  )
}
