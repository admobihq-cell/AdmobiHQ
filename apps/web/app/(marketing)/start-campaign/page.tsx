"use client"

import Link from "next/link"

import { zodResolver } from "@hookform/resolvers/zod"
import { Rocket } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { CampaignLeadInput } from "@/lib/validation/lead-schemas"
import { campaignLeadSchema } from "@/lib/validation/lead-schemas"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { FormSection, formPageGrid } from "@/components/forms/form-section"
import { HoneypotField } from "@/components/forms/honeypot-field"
import { SubmissionSuccess } from "@/components/forms/submission-success"
import { useLeadForm } from "@/components/forms/use-lead-form"
import { Container } from "@/components/landing/container"

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 md:text-sm disabled:opacity-50"

const textareaClass =
  "border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:border-destructive focus-visible:border-ring flex w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"

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
    formState: { errors, isSubmitting },
  } = form

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
              pricing, and a flight plan within 48 hours. Campaigns start from
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
              icon={Rocket}
              title="Brief received"
              message="Someone from Admobi will reach out within 24 hours with availability, pricing, and a flight plan tailored to your brief."
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
                  <select
                    id="sc-duration"
                    className={selectClass}
                    {...register("duration")}
                  >
                    <option value="1_day">1 day</option>
                    <option value="1_week">1 week</option>
                    <option value="2_weeks">2 weeks</option>
                    <option value="1_month">1 month</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-budget">Estimated budget range *</Label>
                  <select
                    id="sc-budget"
                    className={selectClass}
                    {...register("budget")}
                  >
                    <option value="under_50k">Under KSh 50,000</option>
                    <option value="50k_150k">KSh 50,000–150,000</option>
                    <option value="150k_500k">KSh 150,000–500,000</option>
                    <option value="500k_plus">KSh 500,000+</option>
                    <option value="not_sure">Not sure yet</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-objective">Campaign objective</Label>
                  <select
                    id="sc-objective"
                    className={selectClass}
                    {...register("objective")}
                  >
                    <option value="">Select…</option>
                    <option value="awareness">Brand awareness</option>
                    <option value="launch">Product / service launch</option>
                    <option value="promo">Promotion / offer</option>
                    <option value="footfall">
                      Drive footfall / store visits
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sc-creative">Creative status</Label>
                  <select
                    id="sc-creative"
                    className={selectClass}
                    {...register("creativeStatus")}
                  >
                    <option value="">Select…</option>
                    <option value="ready">Artwork ready to go</option>
                    <option value="needs_design">Need design help</option>
                    <option value="not_sure">Not sure yet</option>
                  </select>
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
                  <textarea
                    id="sc-audience"
                    rows={3}
                    placeholder="Age, location, interests, the customer you picture."
                    className={`${textareaClass} min-h-20`}
                    {...register("targetAudience")}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="sc-brief">Brief (optional)</Label>
                  <textarea
                    id="sc-brief"
                    rows={4}
                    placeholder="Target area, flight dates, audience, creative status; whatever helps us prepare."
                    className={`${textareaClass} min-h-24`}
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
