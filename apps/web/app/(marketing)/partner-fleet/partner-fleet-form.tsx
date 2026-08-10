"use client"

import Link from "next/link"

import { zodResolver } from "@hookform/resolvers/zod"
import { Handshake } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { FleetLeadInput } from "@/lib/validation/lead-schemas"
import { fleetLeadSchema } from "@/lib/validation/lead-schemas"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { HoneypotField } from "@/components/forms/honeypot-field"
import { SubmissionSuccess } from "@/components/forms/submission-success"
import { useLeadForm } from "@/components/forms/use-lead-form"

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 md:text-sm disabled:opacity-50"

export default function PartnerFleetForm() {
  const { submitted, submitError, dismissError, honeypot, setHoneypot, submit, reset: resetLeadForm } =
    useLeadForm({ endpoint: "/leads" })

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
  // eslint-disable-next-line react-hooks/incompatible-library
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
    await submit(data)
  }

  function handleReset() {
    form.reset()
    resetLeadForm()
  }

  if (submitted) {
    return (
      <div className="mt-10">
        <SubmissionSuccess
          icon={Handshake}
          title="Deck's on its way"
          message="We'll send over the partnership deck and follow up within 48 hours with onboarding steps and commercial terms sized to your fleet."
          onReset={handleReset}
        />
      </div>
    )
  }

  return (
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

      {submitError ? <ApiErrorBanner message={submitError} onDismiss={dismissError} /> : null}

      <HoneypotField value={honeypot} onChange={setHoneypot} />

      <Button
        type="submit"
        className="w-full"
        disabled={formState.isSubmitting}
        loading={formState.isSubmitting}
        loadingText="Sending…"
        size="lg"
      >
        Request partnership deck
      </Button>
    </form>
  )
}
