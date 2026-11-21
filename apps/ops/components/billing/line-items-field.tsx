"use client"

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { formatKes, type BillingDocumentInput } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { FieldError } from "@/components/billing/form-bits"

const EMPTY_LINE = { description: "", unit: "", quantity: 1, unitPriceKes: 0, taxable: true }

/** SwiftQuote-style item cards: reorder, duplicate, delete, running line total. */
export function LineItemsField() {
  const { control, register, formState } = useFormContext<BillingDocumentInput>()
  const { fields, append, insert, move, remove } = useFieldArray({ control, name: "lines" })
  const lines = useWatch({ control, name: "lines" })
  const errors = formState.errors.lines

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, i) => {
        const line = lines?.[i]
        const amount = Math.round((Number(line?.quantity) || 0) * (Number(line?.unitPriceKes) || 0) * 100) / 100
        const lineErrors = Array.isArray(errors) ? errors[i] : undefined
        const id = (name: string) => `line-${field.id}-${name}`
        return (
          <fieldset key={field.id} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-sm font-medium text-muted-foreground">Item {i + 1}</legend>
              <div className="flex items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move item ${i + 1} down`}
                  disabled={i === fields.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Duplicate item ${i + 1}`}
                  onClick={() => insert(i + 1, { ...EMPTY_LINE, ...line })}
                >
                  <Copy aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete item ${i + 1}`}
                  disabled={fields.length === 1}
                  onClick={() => remove(i)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("description")}>Description</Label>
              <Input
                id={id("description")}
                placeholder="e.g. 7-day screen time, Westlands route"
                aria-invalid={Boolean(lineErrors?.description)}
                aria-describedby={lineErrors?.description ? id("description-error") : undefined}
                {...register(`lines.${i}.description`)}
              />
              <FieldError id={id("description-error")} message={lineErrors?.description?.message} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("quantity")}>Quantity</Label>
                <Input
                  id={id("quantity")}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  aria-invalid={Boolean(lineErrors?.quantity)}
                  {...register(`lines.${i}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("unit")}>Unit</Label>
                <Input id={id("unit")} placeholder="days" {...register(`lines.${i}.unit`)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("price")}>Unit price (KES)</Label>
                <Input
                  id={id("price")}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  aria-invalid={Boolean(lineErrors?.unitPriceKes)}
                  {...register(`lines.${i}.unitPriceKes`, { valueAsNumber: true })}
                />
              </div>
            </div>
            <FieldError message={lineErrors?.quantity?.message ?? lineErrors?.unitPriceKes?.message} />

            <div className="mt-3 flex items-center justify-between">
              <TaxableCheckbox index={i} id={id("taxable")} />
              <span className="text-base font-semibold tabular-nums">{formatKes(amount)}</span>
            </div>
          </fieldset>
        )
      })}

      {typeof errors?.message === "string" ? <FieldError message={errors.message} /> : null}

      <Button type="button" variant="outline" className="self-start" onClick={() => append(EMPTY_LINE)}>
        <Plus aria-hidden />
        Add line item
      </Button>
    </div>
  )
}

function TaxableCheckbox({ index, id }: { index: number; id: string }) {
  const { control, setValue } = useFormContext<BillingDocumentInput>()
  const checked = useWatch({ control, name: `lines.${index}.taxable` })
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked !== false}
        onCheckedChange={(value) => setValue(`lines.${index}.taxable`, value === true, { shouldDirty: true })}
      />
      <Label htmlFor={id} className="font-normal">
        Taxable
      </Label>
    </div>
  )
}
