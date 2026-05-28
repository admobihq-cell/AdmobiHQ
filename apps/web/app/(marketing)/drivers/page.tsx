"use client"

import Link from "next/link"
import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ClipboardList, Cpu, Smartphone, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { DriverJoinInput } from "@/lib/validation/lead-schemas"
import { driverJoinSchema } from "@/lib/validation/lead-schemas"

import { Container } from "@/components/landing/container"

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 md:text-sm disabled:opacity-50"

const heroSteps = [
  {
    title: "Apply",
    detail:
      "Fill in the short form below. We review applications by city and vehicle type.",
    icon: ClipboardList,
  },
  {
    title: "Get approved",
    detail:
      "Our team contacts you within 3 business days to confirm eligibility and schedule installation.",
    icon: Smartphone,
  },
  {
    title: "We install",
    detail:
      "A certified technician fits the LED screen or box to your vehicle. Takes under 2 hours. Free of charge.",
    icon: Cpu,
  },
  {
    title: "Earn monthly",
    detail:
      "Your payout is calculated monthly based on active hours and verified GPS data. Paid to M-Pesa.",
    icon: Wallet,
  },
] as const

const termsCards = [
  {
    heading: "Payout",
    body: "Monthly earnings based on active screen hours. Exact rates confirmed at onboarding based on city and vehicle type. Paid to M-Pesa by the 5th of each month.",
  },
  {
    heading: "Hardware",
    body: "Admobi installs and owns the screen. You do not pay for installation, maintenance, or replacement if the device develops a fault under normal use.",
  },
  {
    heading: "Working hours",
    body: "Screens run automatically during your normal driving hours. You do not need to manage content, scheduling, or playback.",
  },
  {
    heading: "Content standards",
    body: "All ads are reviewed by Admobi before going live. No political, adult, or offensive content. You can flag any ad you are uncomfortable with.",
  },
  {
    heading: "Vehicle requirements",
    body: "Your vehicle must be roadworthy, insured, and actively operating in one of our covered cities. We will confirm eligibility before installation.",
  },
  {
    heading: "Removal",
    body: "Either party can end the arrangement with 14 days notice. We will arrange collection of the hardware at no cost to you.",
  },
  {
    heading: "Data & privacy",
    body: "Your GPS route data is used only for campaign verification and payout calculation. It is not shared with advertisers or third parties.",
  },
] as const

const eligibility = [
  "Operating in Nairobi, Mombasa, or Kisumu",
  "Taxi driver or delivery rider (bike or three-wheeler)",
  "Active on the road at least 4 days a week",
  "Vehicle is insured and roadworthy",
  "Have a working M-Pesa number",
]

const driverFaqItems = [
  {
    q: "Do I pay anything to join?",
    a: "No. Installation, hardware, and maintenance are free.",
  },
  {
    q: "What happens if the screen is damaged?",
    a: "Report it to us. Damage from accidents is reviewed case by case. Fair wear and tear is covered by Admobi.",
  },
  {
    q: "Can I remove the screen myself?",
    a: "No. Removal must be done by our technician to avoid damage to your vehicle. Contact us and we will arrange it.",
  },
  {
    q: "How do I track my earnings?",
    a: "We are building a driver portal. For now, a monthly payout summary is sent via SMS and WhatsApp.",
  },
] as const

export default function DriversPage() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<DriverJoinInput>({
    resolver: zodResolver(driverJoinSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      city: "Nairobi",
      vehicleType: "taxi",
      daysPerWeek: "3_4",
      heardAbout: "whatsapp",
      consent: false,
    },
  })

  const { register, handleSubmit, formState } = form
  const radioClass = "border-input accent-primary size-4 shrink-0 rounded-full border"

  async function onSubmit(data: DriverJoinInput) {
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = (await res.json()) as { success?: boolean }
    if (!res.ok) return
    if (json.success) setSubmitted(true)
  }

  return (
    <div className="border-b border-border pb-14 sm:pb-20">
      <section className="border-border border-b bg-foreground text-background py-14 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-2xl space-y-6">
            <div className="space-y-3">
              <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                Driver program · Kenya cities
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                Earn more on every ride
              </h1>
              <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed sm:text-xl">
                Carry an Admobi screen on your taxi or bike and get paid monthly. No extra work, just drive
                as usual.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
              <Link href="#raise-hand">Raise your hand</Link>
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
            Who can apply
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
            Driver FAQ
          </h2>
          <div className="mt-8 divide-y divide-border border-t border-border">
            {driverFaqItems.map((item) => (
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
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section id="raise-hand" className="scroll-mt-24 border-border border-t py-14 sm:py-20">
        <Container>
          <div className="max-w-xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Raise your hand
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Takes 2 minutes. We&apos;ll be in touch within 3 days.
            </p>
          </div>

          {submitted ? (
            <p className="text-foreground mt-10 max-w-xl text-base font-medium leading-relaxed" role="status">
              We&apos;ve got your details. Someone from our driver team will call or WhatsApp you within 3
              business days.
            </p>
          ) : (
            <form className="mt-10 max-w-xl space-y-8" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="dr-name">Name *</Label>
                <Input id="dr-name" autoComplete="name" {...register("name")} />
                {formState.errors.name ? (
                  <p className="text-destructive text-xs font-medium" role="alert">
                    {formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-phone">Phone / WhatsApp *</Label>
                <Input id="dr-phone" type="tel" autoComplete="tel" {...register("phone")} />
                {formState.errors.phone ? (
                  <p className="text-destructive text-xs font-medium" role="alert">
                    {formState.errors.phone.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-email">Email (optional)</Label>
                <Input id="dr-email" type="email" autoComplete="email" {...register("email")} />
                {formState.errors.email ? (
                  <p className="text-destructive text-xs font-medium" role="alert">
                    {formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-city">City *</Label>
                <select id="dr-city" className={selectClass} {...register("city")}>
                  <option value="Nairobi">Nairobi</option>
                  <option value="Mombasa">Mombasa</option>
                  <option value="Kisumu">Kisumu</option>
                </select>
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-medium text-foreground">Vehicle type *</legend>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="radio" value="taxi" className={radioClass} {...register("vehicleType")} />
                    Taxi
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      value="delivery_bike"
                      className={radioClass}
                      {...register("vehicleType")}
                    />
                    Delivery bike
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      value="three_wheeler"
                      className={radioClass}
                      {...register("vehicleType")}
                    />
                    Three-wheeler
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="radio" value="other" className={radioClass} {...register("vehicleType")} />
                    Other
                  </label>
                </div>
              </fieldset>

              <div className="grid gap-2">
                <Label htmlFor="dr-days">How many days a week do you drive? *</Label>
                <select id="dr-days" className={selectClass} {...register("daysPerWeek")}>
                  <option value="1_2">1–2</option>
                  <option value="3_4">3–4</option>
                  <option value="5_6">5–6</option>
                  <option value="daily">Every day</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-heard">How did you hear about Admobi?</Label>
                <select id="dr-heard" className={selectClass} {...register("heardAbout")}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="facebook">Facebook</option>
                  <option value="friend">Friend</option>
                  <option value="roadside">Roadside</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <label className="flex items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="border-input accent-primary mt-1 size-4 shrink-0 rounded border"
                  {...register("consent")}
                />
                <span>
                  I agree to the{" "}
                  <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
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
                {formState.isSubmitting ? "Sending…" : "Raise my hand"}
              </Button>
            </form>
          )}

          <p className="text-muted-foreground mt-10 max-w-2xl text-xs leading-relaxed">
            Admobi is not an employer. Drivers participate as independent contractors. Payouts are
            subject to active screen hours verified by GPS.
          </p>
        </Container>
      </section>
    </div>
  )
}
