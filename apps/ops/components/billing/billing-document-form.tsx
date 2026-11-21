"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"
import {
  computeBillingTotals,
  formatKes,
  type BillingDocumentInput,
  type BillingDocumentOptionsDto,
} from "@workspace/ops-contracts"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { Field, FormSection } from "@/components/billing/form-bits"
import { LineItemsField } from "@/components/billing/line-items-field"

const NO_CAMPAIGN = "none"

/** Sections 1–5 of the editor. Locking (sent documents) is done by the caller's <fieldset disabled>. */
export function BillingDocumentForm({
  options,
  kindLocked,
}: {
  options: BillingDocumentOptionsDto
  /** The kind is fixed once a number has been assigned. */
  kindLocked: boolean
}) {
  const { register, control, setValue, getFieldState, formState } = useFormContext<BillingDocumentInput>()
  const errors = formState.errors
  const kind = useWatch({ control, name: "kind" })
  const orgId = useWatch({ control, name: "orgId" })
  const values = useWatch({ control })
  const org = options.orgs.find((o) => o.id === orgId) ?? null
  const isQuote = kind === "quote"

  const totals = computeBillingTotals({
    lines: (values.lines ?? []).map((l) => ({
      description: l?.description ?? "",
      unit: l?.unit ?? "",
      quantity: Number(l?.quantity) || 0,
      unitPriceKes: Number(l?.unitPriceKes) || 0,
      taxable: l?.taxable !== false,
    })),
    discountPct: Number(values.discountPct) || 0,
    taxPct: Number(values.taxPct) || 0,
    feeKes: Number(values.feeKes) || 0,
  })

  const setKind = (next: BillingDocumentInput["kind"]) => {
    setValue("kind", next, { shouldDirty: true })
    // Swap the default terms along with the kind, unless someone has edited them.
    if (!getFieldState("terms").isDirty) {
      setValue("terms", next === "quote" ? options.defaults.quoteTerms : options.defaults.invoiceTerms)
    }
  }

  const pickOrg = (value: string) => {
    const picked = options.orgs.find((o) => String(o.id) === value)
    if (!picked) return
    setValue("orgId", picked.id, { shouldDirty: true })
    setValue("campaignId", null, { shouldDirty: true })
    setValue("customer.name", picked.name, { shouldDirty: true })
    setValue("customer.email", picked.billingEmail ?? "", { shouldDirty: true })
    setValue("customer.taxPin", picked.taxPin ?? "", { shouldDirty: true })
  }

  const setProspect = (prospect: boolean) => {
    setValue("orgId", prospect ? null : (options.orgs[0]?.id ?? null), { shouldDirty: true })
    setValue("campaignId", null, { shouldDirty: true })
    if (!prospect && options.orgs[0]) pickOrg(String(options.orgs[0].id))
  }

  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Document details">
        <div
          role="radiogroup"
          aria-label="Document type"
          className="inline-flex w-fit rounded-full bg-muted p-1"
        >
          {(["quote", "invoice"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              disabled={kindLocked}
              onClick={() => setKind(option)}
              className={cn(
                "min-h-9 rounded-full px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed",
                kind === option
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground disabled:opacity-50"
              )}
            >
              {option === "quote" ? "Quote" : "Invoice"}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Issue date" htmlFor="issueDate" error={errors.issueDate?.message}>
            <Input id="issueDate" type="date" {...register("issueDate")} />
          </Field>
          <Field label={isQuote ? "Expiry date" : "Due date"} htmlFor="dueDate" error={errors.dueDate?.message}>
            <Input
              id="dueDate"
              type="date"
              aria-invalid={Boolean(errors.dueDate)}
              aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
              {...register("dueDate")}
            />
          </Field>
          <Field label="Purchase order or reference" htmlFor="reference" error={errors.reference?.message}>
            <Input id="reference" placeholder="PO-1042" {...register("reference")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Customer">
        <div className="flex items-center gap-2">
          <Checkbox id="prospect" checked={orgId === null} onCheckedChange={(v) => setProspect(v === true)} />
          <Label htmlFor="prospect" className="font-normal">
            Not a customer yet (type their details)
          </Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {orgId !== null ? (
            <Field label="Organization" htmlFor="orgId">
              <Select value={orgId ? String(orgId) : undefined} onValueChange={pickOrg}>
                <SelectTrigger id="orgId" className="w-full">
                  <SelectValue placeholder="Pick an organization" />
                </SelectTrigger>
                <SelectContent>
                  {options.orgs.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label="Customer name" htmlFor="customer.name" error={errors.customer?.name?.message}>
            <Input id="customer.name" aria-invalid={Boolean(errors.customer?.name)} {...register("customer.name")} />
          </Field>
          <Field label="Contact person" htmlFor="customer.contact">
            <Input id="customer.contact" {...register("customer.contact")} />
          </Field>
          <Field label="Email" htmlFor="customer.email" error={errors.customer?.email?.message}>
            <Input id="customer.email" type="email" autoComplete="off" {...register("customer.email")} />
          </Field>
          <Field label="Phone" htmlFor="customer.phone">
            <Input id="customer.phone" type="tel" {...register("customer.phone")} />
          </Field>
          <Field label="KRA PIN" htmlFor="customer.taxPin">
            <Input id="customer.taxPin" className="uppercase" {...register("customer.taxPin")} />
          </Field>
          <Field label="Billing address" htmlFor="customer.address" className="sm:col-span-2">
            <Textarea id="customer.address" rows={3} {...register("customer.address")} />
          </Field>
          {orgId !== null ? (
            <Field
              label="Campaign"
              htmlFor="campaignId"
              hint={org && org.campaigns.length === 0 ? "This organization has no campaigns yet." : undefined}
            >
              <Controller
                control={control}
                name="campaignId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NO_CAMPAIGN}
                    onValueChange={(v) => field.onChange(v === NO_CAMPAIGN ? null : Number(v))}
                    disabled={!org}
                  >
                    <SelectTrigger id="campaignId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CAMPAIGN}>No campaign</SelectItem>
                      {org?.campaigns.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Line items">
        <LineItemsField />
      </FormSection>

      <FormSection title="Adjustments and totals">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount (%)" htmlFor="discountPct" error={errors.discountPct?.message}>
            <Input id="discountPct" type="number" inputMode="decimal" min={0} max={100} step="any" {...register("discountPct", { valueAsNumber: true })} />
          </Field>
          <Field label="Tax (%)" htmlFor="taxPct" hint="VAT in Kenya is 16%." error={errors.taxPct?.message}>
            <Input id="taxPct" type="number" inputMode="decimal" min={0} max={100} step="any" {...register("taxPct", { valueAsNumber: true })} />
          </Field>
          <Field label="Additional fee label" htmlFor="feeLabel">
            <Input id="feeLabel" placeholder="Production" {...register("feeLabel")} />
          </Field>
          <Field label="Additional fee (KES)" htmlFor="feeKes" error={errors.feeKes?.message}>
            <Input id="feeKes" type="number" inputMode="decimal" min={0} step="0.01" {...register("feeKes", { valueAsNumber: true })} />
          </Field>
        </div>
        <dl className="flex flex-col gap-2 rounded-2xl bg-foreground p-5 text-sm text-background tabular-nums">
          <TotalRow label="Subtotal" value={formatKes(totals.subtotalKes)} />
          {totals.discountKes > 0 ? <TotalRow label={`Discount (${values.discountPct}%)`} value={`−${formatKes(totals.discountKes)}`} /> : null}
          {totals.taxKes > 0 ? <TotalRow label={`Tax (${values.taxPct}%)`} value={formatKes(totals.taxKes)} /> : null}
          {totals.feeKes > 0 ? <TotalRow label={values.feeLabel || "Additional fee"} value={formatKes(totals.feeKes)} /> : null}
          <div className="mt-1 flex items-baseline justify-between border-t border-background/20 pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatKes(totals.totalKes)}</dd>
          </div>
        </dl>
      </FormSection>

      <FormSection title="Notes and terms">
        <Field label="Client note" htmlFor="note">
          <Textarea id="note" rows={3} {...register("note")} />
        </Field>
        <Field label="Payment instructions" htmlFor="paymentInstructions">
          <Textarea id="paymentInstructions" rows={3} {...register("paymentInstructions")} />
        </Field>
        <Field label="Terms and conditions" htmlFor="terms">
          <Textarea id="terms" rows={3} {...register("terms")} />
        </Field>
      </FormSection>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-background/80">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
