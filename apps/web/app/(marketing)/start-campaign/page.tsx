"use client"

import Link from "next/link"
import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { CREATIVE_STATUS, type CreativeStatus } from "@workspace/ops-contracts/enums"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import type { CampaignLeadInput } from "@/lib/validation/lead-schemas"
import { campaignLeadSchema } from "@/lib/validation/lead-schemas"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { FormSection, formPageGrid } from "@/components/forms/form-section"
import { FormSelect } from "@/components/forms/form-select"
import { HoneypotField } from "@/components/forms/honeypot-field"
import { SubmissionSuccess } from "@/components/forms/submission-success"
import { useLeadForm } from "@/components/forms/use-lead-form"
import { Container } from "@/components/landing/container"
import { readEstimate } from "@/lib/estimate-handoff"

const cityOptions = ["Nairobi", "Mombasa", "Kisumu", "All"] as const

export default function StartCampaignPage() {
  const {
    submitted,
    submitError,
    dismissError,
    honeypot,
    setHoneypot,
    submit,
    reset: resetLeadForm,
  } = useLeadForm({ endpoint: "/leads" })

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
      objective: undefined,
      industry: "",
      campaignStartDate: "",
      creativeStatus: undefined,
      targetAudience: "",
      brief: "",
      consent: false,
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = form

  // /products-solutions links here with ?creative=needs_design to preselect "Need design help";
  // the /pricing simulators link here with their estimate (see lib/estimate-handoff).
  useEffect(() => {
    const creative = new URLSearchParams(window.location.search).get("creative")
    if (creative && (CREATIVE_STATUS as readonly string[]).includes(creative)) {
      setValue("creativeStatus", creative as CreativeStatus)
    }
    const estimate = readEstimate(window.location.search)
    if (estimate.adFormats) setValue("adFormats", estimate.adFormats)
    if (estimate.duration) setValue("duration", estimate.duration)
    if (estimate.budget) setValue("budget", estimate.budget)
    if (estimate.brief) setValue("brief", estimate.brief)
  }, [setValue])

  // eslint-disable-next-line react-hooks/incompatible-library
  const citiesWatch = watch("cities").slice()
  const adFormatsWatch = watch("adFormats").slice()

  function toggleCity(city: (typeof cityOptions)[number]) {
    const curr = citiesWatch.slice()
    if (city === "All") {
      setValue("cities", curr.includes("All") ? [] : ["All"], {
        shouldValidate: true,
      })
      return
    }
    let next = curr.filter((v) => v !== "All")
    if (next.includes(city)) next = next.filter((v) => v !== city)
    else next = [...next, city]
    setValue("cities", next, { shouldValidate: true })
  }

  function toggleFormat(key: "taxi_top" | "delivery_bike") {
    const curr = adFormatsWatch.slice()
    const next = curr.includes(key)
      ? curr.filter((v) => v !== key)
      : [...curr, key]
    setValue("adFormats", next, { shouldValidate: true })
  }

  function setBothFormats() {
    setValue(
      "adFormats",
      adFormatsWatch.length === 2 &&
        adFormatsWatch.includes("taxi_top") &&
        adFormatsWatch.includes("delivery_bike")
        ? []
        : ["taxi_top", "delivery_bike"],
      { shouldValidate: true }
    )
  }

  async function onSubmit(data: CampaignLeadInput) {
    await submit({ ...data, phone: data.phone?.trim() || undefined })
  }

  function handleReset() {
    form.reset()
    resetLeadForm()
  }

  return (
    <div className="border-b border-border py-10 sm:py-16 lg:py-20">
      {/* DOM order intro → form → reasons keeps the form near the top on phones;
          from lg the reasons move back under the intro in the left column. */}
      <Container className={`${formPageGrid} lg:grid-rows-[auto_1fr]`}>
        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-[2rem]">
              Start a campaign
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Tell us what you want to run. We&apos;ll come back with
              availability, pricing, and a plan.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
              Advertise on taxi tops across Nairobi
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Fill in the brief and we&apos;ll come back with availability,
              pricing, and a flight plan in 3 to 7 working days. Campaigns start from
              one day, no long-term contracts, no minimum fleet commitment.
              Outdoor advertising in Nairobi doesn&apos;t have to mean locking
              into a 6-month billboard. Admobi taxi-top screens let you run
              bursts around events, launches, and promotions, then pause when
              you don&apos;t need the air.
            </p>
          </div>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {submitted ? (
            <SubmissionSuccess
              title="Your brief is with us"
              steps={[
                { label: "Brief received", when: "Just now" },
                { label: "We check screen availability for your cities and dates" },
                { label: "Someone from Admobi reaches out with pricing and a flight plan", when: "In 3 to 7 working days" },
              ]}
              resetLabel="Submit another brief"
              onReset={handleReset}
            />
          ) : (
            <form
              className="space-y-8 sm:space-y-10"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
            >
              <FormSection title="About you">
                <div className="grid gap-2">
                  <Label htmlFor="sc-name">Your name *</Label>
                  <Input
                    id="sc-name"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="alert"
                    >
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-email">Work email *</Label>
                  <Input
                    id="sc-email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-company">Company or brand name *</Label>
                  <Input
                    id="sc-company"
                    autoComplete="organization"
                    {...register("company")}
                    aria-invalid={!!errors.company}
                  />
                  {errors.company ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="alert"
                    >
                      {errors.company.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-phone">Phone number (optional)</Label>
                  <Input
                    id="sc-phone"
                    type="tel"
                    autoComplete="tel"
                    {...register("phone")}
                  />
                </div>
              </FormSection>

              <FormSection title="The campaign">
                <fieldset className="space-y-2 sm:col-span-2">
                  <legend className="mb-3 text-sm font-medium text-foreground">
                    City *
                  </legend>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {cityOptions.map((city) => (
                      <label
                        key={city}
                        className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={citiesWatch.includes(city)}
                          onChange={() => toggleCity(city)}
                          className="size-4 rounded border border-input accent-primary"
                        />
                        <span>{city}</span>
                      </label>
                    ))}
                  </div>
                  {errors.cities ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="alert"
                    >
                      {errors.cities.message as string}
                    </p>
                  ) : null}
                </fieldset>

                <fieldset className="space-y-2 sm:col-span-2">
                  <legend className="mb-3 text-sm font-medium text-foreground">
                    Ad format *
                  </legend>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={adFormatsWatch.includes("taxi_top")}
                        onChange={() => toggleFormat("taxi_top")}
                        className="size-4 rounded border border-input accent-primary"
                      />
                      <span>Taxi-top screens</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={adFormatsWatch.includes("delivery_bike")}
                        onChange={() => toggleFormat("delivery_bike")}
                        className="size-4 rounded border border-input accent-primary"
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
                        className="size-4 rounded border border-input accent-primary"
                      />
                      <span>Both</span>
                    </label>
                  </div>
                  {errors.adFormats ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="alert"
                    >
                      {errors.adFormats.message as string}
                    </p>
                  ) : null}
                </fieldset>

                <div className="grid gap-2">
                  <Label htmlFor="sc-duration">Campaign duration *</Label>
                  <FormSelect
                    id="sc-duration"
                    control={control}
                    name="duration"
                    options={[
                      { value: "1_day", label: "1 day" },
                      { value: "1_week", label: "1 week" },
                      { value: "2_weeks", label: "2 weeks" },
                      { value: "1_month", label: "1 month" },
                      { value: "ongoing", label: "Ongoing" },
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-budget">Estimated budget range *</Label>
                  <FormSelect
                    id="sc-budget"
                    control={control}
                    name="budget"
                    options={[
                      { value: "under_50k", label: "Under KSh 50,000" },
                      { value: "50k_150k", label: "KSh 50,000–150,000" },
                      { value: "150k_500k", label: "KSh 150,000–500,000" },
                      { value: "500k_plus", label: "KSh 500,000+" },
                      { value: "not_sure", label: "Not sure yet" },
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-objective">Campaign objective</Label>
                  <FormSelect
                    id="sc-objective"
                    control={control}
                    name="objective"
                    options={[
                      { value: "awareness", label: "Brand awareness" },
                      { value: "launch", label: "Product / service launch" },
                      { value: "promo", label: "Promotion / offer" },
                      { value: "footfall", label: "Drive footfall / store visits" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-creative">Creative status</Label>
                  <FormSelect
                    id="sc-creative"
                    control={control}
                    name="creativeStatus"
                    options={[
                      { value: "ready", label: "Artwork ready to go" },
                      { value: "needs_design", label: "Need design help" },
                      { value: "not_sure", label: "Not sure yet" },
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-industry">Industry</Label>
                  <Input
                    id="sc-industry"
                    placeholder="e.g. FMCG, fintech, retail"
                    {...register("industry")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-start">Preferred start date</Label>
                  <Input
                    id="sc-start"
                    type="date"
                    {...register("campaignStartDate")}
                  />
                </div>
              </FormSection>

              <FormSection title="A bit more detail">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="sc-audience">
                    Who are you trying to reach? (optional)
                  </Label>
                  <Textarea
                    id="sc-audience"
                    rows={3}
                    placeholder="Age, location, interests, the customer you picture."
                    className="min-h-20"
                    {...register("targetAudience")}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="sc-brief">Brief (optional)</Label>
                  <Textarea
                    id="sc-brief"
                    rows={4}
                    placeholder="Target area, flight dates, audience, creative status; whatever helps us prepare."
                    className="min-h-24"
                    {...register("brief")}
                  />
                </div>
              </FormSection>

              <div className="space-y-6">
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 rounded border border-input accent-primary"
                    {...register("consent")}
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      href="/privacy"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.consent ? (
                  <p
                    className="text-xs font-medium text-destructive"
                    role="alert"
                  >
                    {errors.consent.message}
                  </p>
                ) : null}

                {submitError ? (
                  <ApiErrorBanner
                    message={submitError}
                    onDismiss={dismissError}
                  />
                ) : null}

                <HoneypotField value={honeypot} onChange={setHoneypot} />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  loadingText="Sending…"
                  size="lg"
                >
                  Send brief
                </Button>
              </div>
            </form>
          )}
        </div>

        <section className="space-y-6 border-t border-border pt-10 lg:col-start-1">
          <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
            Why brands choose Admobi for taxi-top OOH
          </h2>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              Campaigns start from one day
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Book a single day around a product launch, event, or promotion,
              then pause when the moment passes. No minimum fleet commitment or
              multi-month lock-in required to test taxi-top OOH in Nairobi.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              GPS-verified proof of every play
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every creative rotation is logged with location data so you know
              where your ad ran, not just that it aired. Post-campaign reports
              show corridor coverage you can reconcile against your brief.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              No long-term contracts
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Scale up for sustained programmes or wind down between bursts
              without renegotiating terms. Admobi is built for brands that need
              outdoor reach without billboard-style commitment.
            </p>
          </div>
        </section>
      </Container>
    </div>
  )
}
