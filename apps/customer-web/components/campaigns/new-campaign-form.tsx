"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import {
  FLIGHT_DURATIONS,
  endsOnFromDuration,
  formatFlightDates,
  type FlightDuration,
} from "@/lib/campaign-calendar"
import { createCampaign, formatLabelFor, type CampaignFormat } from "@/lib/campaigns"

const MARKETS = ["CBD", "Westlands", "Karen", "Kilimani", "Mombasa Rd", "Eastlands"] as const
const FORMATS: CampaignFormat[] = ["taxi_top", "delivery_bike", "both"]

export function NewCampaignForm({
  onCreated,
  initialStartsOn,
  initialEndsOn,
}: {
  onCreated?: () => void
  initialStartsOn?: string | null
  initialEndsOn?: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [market, setMarket] = useState<(typeof MARKETS)[number]>("CBD")
  const [format, setFormat] = useState<CampaignFormat>("taxi_top")
  const [duration, setDuration] = useState<FlightDuration>("1 week")
  const [useSelectedEnd, setUseSelectedEnd] = useState(
    Boolean(initialStartsOn && initialEndsOn && initialStartsOn !== initialEndsOn),
  )
  const [budget, setBudget] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endsOn =
    initialStartsOn == null
      ? null
      : useSelectedEnd && initialEndsOn
        ? initialEndsOn
        : endsOnFromDuration(initialStartsOn, duration)

  const flightPreview =
    initialStartsOn && endsOn ? formatFlightDates(initialStartsOn, endsOn) : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const budgetKes = Number(budget.replace(/[^0-9]/g, ""))
    if (!name.trim()) {
      setError("Give this campaign a name.")
      return
    }
    if (!budgetKes || budgetKes <= 0) {
      setError("Enter a budget in KES.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = createCampaign({
        name: name.trim(),
        market: `${market} · new campaign`,
        format,
        budgetKes,
        duration,
        startsOn: initialStartsOn ?? null,
        endsOn,
      })
      onCreated?.()
      router.push(`/campaigns/${created.id}`)
    } catch {
      setError("Couldn't save this campaign. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign name *</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Kilimani Launch Week"
        />
      </div>

      <div className="space-y-2">
        <Label>Market</Label>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((option) => {
            const active = option === market
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(!active && "text-muted-foreground")}
                onClick={() => setMarket(option)}
              >
                {option}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((option) => {
            const active = option === format
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(!active && "text-muted-foreground")}
                onClick={() => setFormat(option)}
              >
                {formatLabelFor(option)}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Flight length</Label>
        {flightPreview ? (
          <p className="text-xs text-muted-foreground">Window: {flightPreview}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {FLIGHT_DURATIONS.map((option) => {
            const active = option === duration
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(!active && "text-muted-foreground")}
                onClick={() => {
                  setDuration(option)
                  setUseSelectedEnd(false)
                }}
              >
                {option}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-budget">Budget (KES) *</Label>
        <Input
          id="campaign-budget"
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          placeholder="e.g. 120000"
          inputMode="numeric"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? "Creating…" : "Create campaign"}
      </Button>
    </form>
  )
}
