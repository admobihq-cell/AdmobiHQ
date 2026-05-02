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
    let next = curr.includes(key) ? curr.filter((v) => v !== key) : [...curr, key]
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
    const res = await fetch("/api/leads", {
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
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-block text-sm font-medium"
          >
            ← Back home
          </Link>
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
        <div className="mb-10 max-w-xl space-y-2">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-block text-sm font-medium"
          >
            ← Back home
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Start a campaign
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Tell us what you want to run. We&apos;ll come back with availability, pricing, and a plan.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-16">
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
                <Link href="#" className="text-primary underline-offset-4 hover:underline">
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

          <aside className="text-muted-foreground hidden space-y-5 rounded-2xl border border-border bg-muted/35 p-6 text-sm leading-relaxed lg:block lg:sticky lg:top-24">
            <p className="text-foreground text-base font-semibold">Why advertisers choose Admobi</p>
            <ul className="marker:text-primary list-disc space-y-3 ps-4">
              <li>Campaigns start from one day</li>
              <li>GPS-verified proof of every play</li>
              <li>No long-term contracts</li>
            </ul>
          </aside>

          <div className="text-muted-foreground space-y-5 rounded-2xl border border-border bg-muted/35 p-6 text-sm leading-relaxed lg:hidden">
            <p className="text-foreground text-base font-semibold">Why advertisers choose Admobi</p>
            <ul className="marker:text-primary list-disc space-y-3 ps-4">
              <li>Campaigns start from one day</li>
              <li>GPS-verified proof of every play</li>
              <li>No long-term contracts</li>
            </ul>
          </div>
        </div>
      </Container>
    </div>
  )
}
