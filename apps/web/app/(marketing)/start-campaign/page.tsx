"use client"

import Link from "next/link"
import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { CampaignLeadInput } from "@/lib/validation/lead-schemas"
import { campaignLeadSchema } from "@/lib/validation/lead-schemas"

import { publicApiUrl } from "@workspace/ops-api-client"

import { Container } from "@/components/landing/container"

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 md:text-sm disabled:opacity-50"

const cityOptions = ["Nairobi", "Mombasa", "Kisumu", "All"] as const

export default function StartCampaignPage() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<CampaignLeadInput>({
    resolver: zodResolver(campaignLeadSchema),
    defaultValues: {
      audience: "campaign",
      name: "",
      email: "",
      company: "",
      phone: "",
      cities: [],
      adFormats: [],
      duration: "1_week",
      budget: "not_sure",
      brief: "",
      consent: false,
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  // eslint-disable-next-line react-hooks/incompatible-library
  const citiesWatch = watch("cities").slice()
  const adFormatsWatch = watch("adFormats").slice()

  function toggleCity(city: (typeof cityOptions)[number]) {
    const curr = citiesWatch.slice()
    if (city === "All") {
      setValue(
        "cities",
        curr.includes("All") ? [] : ["All"],
        { shouldValidate: true },
      )
      return
    }
    let next = curr.filter((v) => v !== "All")
    if (next.includes(city)) next = next.filter((v) => v !== city)
    else next = [...next, city]
    setValue("cities", next, { shouldValidate: true })
  }

  function toggleFormat(key: "taxi_top" | "delivery_bike") {
    const curr = adFormatsWatch.slice()
    const next = curr.includes(key) ? curr.filter((v) => v !== key) : [...curr, key]
    setValue("adFormats", next, { shouldValidate: true })
  }

  function setBothFormats() {
    setValue(
      "adFormats",
      adFormatsWatch.length === 2 && adFormatsWatch.includes("taxi_top") && adFormatsWatch.includes("delivery_bike")
        ? []
        : ["taxi_top", "delivery_bike"],
      { shouldValidate: true },
    )
  }

  async function onSubmit(data: CampaignLeadInput) {
    const body = {
      ...data,
      phone: data.phone?.trim() || undefined,
    }
    const res = await fetch(publicApiUrl("/leads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { success?: boolean }
    if (!res.ok) return
    if (json.success) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] border-b border-border py-14 sm:py-20">
        <Container className="max-w-3xl space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            We&apos;ve got your brief.
          </h1>
          <p className="text-muted-foreground max-w-[55ch] text-base leading-relaxed">
            Someone from Admobi will reach out within 24 hours.
          </p>
        </Container>
      </div>
    )
  }

  return (
    <div className="border-b border-border py-10 sm:py-16 lg:py-20">
      <Container>
        <div className="mb-10 max-w-2xl space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Start a campaign
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Tell us what you want to run. We&apos;ll come back with availability, pricing, and a plan.
          </p>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              Advertise on taxi tops across Nairobi
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Fill in the brief below and we&apos;ll come back with availability, pricing, and a flight plan within 48 hours. Campaigns start from one day, no long-term contracts, no minimum fleet commitment. Outdoor advertising in Nairobi doesn&apos;t have to mean locking into a 6-month billboard. Admobi taxi-top screens let you run bursts around events, launches, and promotions, then pause when you don&apos;t need the air.
            </p>
          </div>
        </div>

        <form className="max-w-xl space-y-8" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="sc-name">Your name *</Label>
              <Input id="sc-name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-email">Work email *</Label>
              <Input id="sc-email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
              {errors.email ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-company">Company or brand name *</Label>
              <Input id="sc-company" {...register("company")} aria-invalid={!!errors.company} />
              {errors.company ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.company.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-phone">Phone number (optional)</Label>
              <Input id="sc-phone" type="tel" autoComplete="tel" {...register("phone")} />
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-3 text-sm font-medium text-foreground">City *</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {cityOptions.map((city) => (
                  <label key={city} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={citiesWatch.includes(city)}
                      onChange={() => toggleCity(city)}
                      className="border-input accent-primary size-4 rounded border"
                    />
                    <span>{city}</span>
                  </label>
                ))}
              </div>
              {errors.cities ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.cities.message as string}
                </p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-3 text-sm font-medium text-foreground">Ad format *</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={adFormatsWatch.includes("taxi_top")}
                    onChange={() => toggleFormat("taxi_top")}
                    className="border-input accent-primary size-4 rounded border"
                  />
                  <span>Taxi-top screens</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={adFormatsWatch.includes("delivery_bike")}
                    onChange={() => toggleFormat("delivery_bike")}
                    className="border-input accent-primary size-4 rounded border"
                  />
                  <span>Delivery bike boxes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={
                      adFormatsWatch.includes("taxi_top") &&
                      adFormatsWatch.includes("delivery_bike")
                    }
                    onChange={setBothFormats}
                    className="border-input accent-primary size-4 rounded border"
                  />
                  <span>Both</span>
                </label>
              </div>
              {errors.adFormats ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.adFormats.message as string}
                </p>
              ) : null}
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="sc-duration">Campaign duration *</Label>
              <select id="sc-duration" className={selectClass} {...register("duration")}>
                <option value="1_day">1 day</option>
                <option value="1_week">1 week</option>
                <option value="2_weeks">2 weeks</option>
                <option value="1_month">1 month</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-budget">Estimated budget range *</Label>
              <select id="sc-budget" className={selectClass} {...register("budget")}>
                <option value="under_50k">Under KSh 50,000</option>
                <option value="50k_150k">KSh 50,000–150,000</option>
                <option value="150k_500k">KSh 150,000–500,000</option>
                <option value="500k_plus">KSh 500,000+</option>
                <option value="not_sure">Not sure yet</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-brief">Brief (optional)</Label>
              <textarea
                id="sc-brief"
                rows={4}
                placeholder="Target area, flight dates, audience, creative status; whatever helps us prepare."
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:border-destructive focus-visible:border-ring flex min-h-24 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
                {...register("brief")}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-foreground">
              <input type="checkbox" className="border-input accent-primary mt-1 size-4 shrink-0 rounded border" {...register("consent")} />
              <span>
                I agree to the{" "}
                <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                  privacy policy
                </Link>
                .
              </span>
            </label>
            {errors.consent ? (
              <p className="text-destructive text-xs font-medium" role="alert">
                {errors.consent.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting ? "Sending…" : "Send brief"}
            </Button>
          </form>

        <section className="mt-14 max-w-2xl space-y-8 sm:mt-16">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Why brands choose Admobi for taxi-top OOH
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Campaigns start from one day</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Book a single day around a product launch, event, or promotion, then pause when the moment passes. No minimum fleet commitment or multi-month lock-in required to test taxi-top OOH in Nairobi.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">GPS-verified proof of every play</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Every creative rotation is logged with location data so you know where your ad ran, not just that it aired. Post-campaign reports show corridor coverage you can reconcile against your brief.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No long-term contracts</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Scale up for sustained programmes or wind down between bursts without renegotiating terms. Admobi is built for brands that need outdoor reach without billboard-style commitment.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  )
}
