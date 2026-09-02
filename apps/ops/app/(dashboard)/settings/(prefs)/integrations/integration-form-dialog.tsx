"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  BILLING_CYCLES,
  CATEGORIES,
  CURRENCIES,
  STATUSES,
  STATUS_LABEL,
} from "@/lib/integration-costs"
import type { IntegrationDto } from "@/lib/queries/integrations"

const selectClass =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"

const CYCLE_LABEL: Record<string, string> = {
  monthly: "Monthly",
  annual: "Annual",
  usage: "Usage-based",
  free: "Free",
}

export type IntegrationFormValues = {
  id?: number
  name: string
  category: string
  purpose: string
  url: string
  plan: string
  cost: string
  currency: string
  billing_cycle: string
  status: string
  owner: string
  notes: string
}

function toFormValues(integration: IntegrationDto | null): IntegrationFormValues {
  return {
    id: integration?.id,
    name: integration?.name ?? "",
    category: integration?.category ?? CATEGORIES[0]!.value,
    purpose: integration?.purpose ?? "",
    url: integration?.url ?? "",
    plan: integration?.plan ?? "",
    cost: integration ? String(integration.cost) : "0",
    currency: integration?.currency ?? "USD",
    billing_cycle: integration?.billing_cycle ?? "monthly",
    status: integration?.status ?? "active",
    owner: integration?.owner ?? "",
    notes: integration?.notes ?? "",
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: IntegrationDto | null
  saving: boolean
  onSubmit: (values: IntegrationFormValues) => void
}

export function IntegrationFormDialog({ open, onOpenChange, integration, saving, onSubmit }: Props) {
  const [values, setValues] = useState<IntegrationFormValues>(() => toFormValues(integration))

  useEffect(() => {
    if (open) setValues(toFormValues(integration))
  }, [open, integration])

  const set = <K extends keyof IntegrationFormValues>(key: K, value: IntegrationFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const costDisabled = values.billing_cycle === "free" || values.billing_cycle === "usage"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{integration ? "Edit integration" : "Add integration"}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ ...values, name: values.name.trim() })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="integration-name">Name</Label>
            <Input
              id="integration-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Vercel"
              required
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-category">Category</Label>
              <select
                id="integration-category"
                className={selectClass}
                value={values.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-status">Status</Label>
              <select
                id="integration-status"
                className={selectClass}
                value={values.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="integration-purpose">What it&rsquo;s for</Label>
            <Input
              id="integration-purpose"
              value={values.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="One line on what it does for us"
              maxLength={300}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="integration-plan">Plan</Label>
            <Input
              id="integration-plan"
              value={values.plan}
              onChange={(e) => set("plan", e.target.value)}
              placeholder="e.g. Pro, Launch, Free"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-billing">Billing</Label>
              <select
                id="integration-billing"
                className={selectClass}
                value={values.billing_cycle}
                onChange={(e) => set("billing_cycle", e.target.value)}
              >
                {BILLING_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {CYCLE_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-cost">Cost</Label>
              <Input
                id="integration-cost"
                type="number"
                min={0}
                step="0.01"
                value={costDisabled ? "0" : values.cost}
                onChange={(e) => set("cost", e.target.value)}
                disabled={costDisabled}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-currency">Currency</Label>
              <select
                id="integration-currency"
                className={selectClass}
                value={values.currency}
                onChange={(e) => set("currency", e.target.value)}
                disabled={costDisabled}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {costDisabled ? (
            <p className="-mt-2 text-xs text-muted-foreground">
              {values.billing_cycle === "free"
                ? "Free plans don't count toward the monthly total."
                : "Usage-based costs are listed separately, not in the monthly total."}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-owner">Owner</Label>
              <Input
                id="integration-owner"
                value={values.owner}
                onChange={(e) => set("owner", e.target.value)}
                placeholder="Who manages it"
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-url">Link</Label>
              <Input
                id="integration-url"
                type="url"
                value={values.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="integration-notes">Notes</Label>
            <Textarea
              id="integration-notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !values.name.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
