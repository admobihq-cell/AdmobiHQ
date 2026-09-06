"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CAMPAIGN_FORMATS,
  CAMPAIGN_OBJECTIVES,
  type CampaignDto,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Stepper, type StepperStep } from "@workspace/ui/components/stepper"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { CreativeUploadField } from "@/components/campaigns/creative-upload-field"
import { useCreateCampaign, useSubmitCampaign, useUpdateCampaign } from "@/lib/use-campaigns"

const MARKETS = ["CBD", "Westlands", "Karen", "Kilimani", "Mombasa Rd", "Eastlands"] as const

const FORMAT_LABELS: Record<CampaignFormat, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Both panels",
}

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: "Awareness",
  launch: "Launch",
  promo: "Promotion",
  footfall: "Footfall",
  other: "Other",
}

const STEP_LABELS = ["Brief", "Flight & budget", "Creative", "Review"]

/** Which steps are satisfied by the campaign as it stands, so someone
 * resuming a "changes requested" campaign lands on the first thing actually
 * missing rather than back at step one. */
function stepCompletion(campaign: CampaignDto | null): [boolean, boolean, boolean] {
  if (!campaign) return [false, false, false]
  return [
    Boolean(campaign.name && campaign.market && campaign.format),
    Boolean(campaign.budget_kes && campaign.starts_on && campaign.ends_on),
    campaign.creatives.length > 0,
  ]
}

function firstIncompleteStep(campaign: CampaignDto | null): number {
  const done = stepCompletion(campaign)
  const index = done.findIndex((complete) => !complete)
  return index === -1 ? 3 : index
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[]
  value: T | null
  onChange: (next: T) => void
  labels?: Record<string, string>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value
        return (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn(!active && "text-muted-foreground")}
            onClick={() => onChange(option)}
          >
            {labels?.[option] ?? option}
          </Button>
        )
      })}
    </div>
  )
}

export function CampaignWizard({
  initialCampaign,
  initialStartsOn,
  initialEndsOn,
}: {
  initialCampaign: CampaignDto | null
  initialStartsOn?: string | null
  initialEndsOn?: string | null
}) {
  const router = useRouter()
  const create = useCreateCampaign()
  const update = useUpdateCampaign()
  const submit = useSubmitCampaign()

  const [campaign, setCampaign] = useState<CampaignDto | null>(initialCampaign)
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteStep(initialCampaign))

  const [name, setName] = useState(initialCampaign?.name ?? "")
  const [market, setMarket] = useState<string | null>(initialCampaign?.market ?? null)
  const [format, setFormat] = useState<CampaignFormat>(
    (initialCampaign?.format as CampaignFormat) ?? "taxi_top",
  )
  const [objective, setObjective] = useState<string | null>(initialCampaign?.objective ?? null)
  const [corridors, setCorridors] = useState(initialCampaign?.corridors ?? "")
  const [budget, setBudget] = useState(initialCampaign?.budget_kes ?? "")
  const [startsOn, setStartsOn] = useState(initialCampaign?.starts_on ?? initialStartsOn ?? "")
  const [endsOn, setEndsOn] = useState(initialCampaign?.ends_on ?? initialEndsOn ?? "")
  const [error, setError] = useState<string | null>(null)

  const done = stepCompletion(campaign)
  const steps: StepperStep[] = STEP_LABELS.map((label, index) => ({
    label,
    status:
      index === stepIndex
        ? "current"
        : (index < 3 && done[index]) || index < stepIndex
          ? "complete"
          : "upcoming",
  }))
  const progressPercent = Math.round((done.filter(Boolean).length / 3) * 100)
  const saving = create.isPending || update.isPending

  /** The draft is created on leaving step 1 and PATCHed on every step after,
   * so a half-finished campaign survives a refresh instead of living only in
   * this component's state. */
  async function persist(data: Record<string, unknown>): Promise<CampaignDto | null> {
    try {
      if (!campaign) {
        const created = await create.mutateAsync({ name: name.trim(), ...data } as never)
        setCampaign(created)
        return created
      }
      const updated = await update.mutateAsync({ id: campaign.id, data: data as never })
      setCampaign(updated)
      return updated
    } catch {
      return null
    }
  }

  async function completeBrief() {
    if (!name.trim()) return setError("Give this campaign a name.")
    if (!market) return setError("Pick a market.")
    setError(null)
    const saved = await persist({
      name: name.trim(),
      market,
      format,
      ...(objective ? { objective } : {}),
      ...(corridors.trim() ? { corridors: corridors.trim() } : {}),
    })
    if (saved) setStepIndex(1)
  }

  async function completeFlight() {
    const budgetKes = Number(String(budget).replace(/[^0-9.]/g, ""))
    if (!budgetKes || budgetKes <= 0) return setError("Enter a budget in KES.")
    if (!startsOn || !endsOn) return setError("Pick a start and end date.")
    if (endsOn < startsOn) return setError("The flight can't end before it starts.")
    setError(null)
    const saved = await persist({ budget_kes: budgetKes, starts_on: startsOn, ends_on: endsOn })
    if (saved) setStepIndex(2)
  }

  async function handleSubmit() {
    if (!campaign) return
    const result = await submit.mutateAsync(campaign.id).catch(() => null)
    if (result) router.push(`/campaigns/${campaign.id}`)
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-3">
        <Stepper steps={steps} />
        <p className="text-center text-xs font-medium text-muted-foreground">
          {progressPercent}% complete
          {progressPercent > 0 && progressPercent < 100 ? " — almost there!" : ""}
        </p>
      </div>

      {stepIndex === 0 ? (
        <div className="space-y-6">
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
            <Label>Market *</Label>
            <ChoiceRow options={MARKETS} value={market as never} onChange={setMarket} />
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <ChoiceRow
              options={CAMPAIGN_FORMATS}
              value={format}
              onChange={setFormat}
              labels={FORMAT_LABELS}
            />
          </div>

          <div className="space-y-2">
            <Label>Objective</Label>
            <ChoiceRow
              options={CAMPAIGN_OBJECTIVES}
              value={objective as never}
              onChange={setObjective}
              labels={OBJECTIVE_LABELS}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-corridors">Corridors or routes</Label>
            <Textarea
              id="campaign-corridors"
              value={corridors}
              onChange={(event) => setCorridors(event.target.value)}
              placeholder="Anything specific your account manager should know"
              rows={3}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="button" className="w-full" loading={saving} onClick={() => void completeBrief()}>
            Continue
          </Button>
        </div>
      ) : null}

      {stepIndex === 1 ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-start">Start date *</Label>
              {/* Native date input: no picker dependency, and it speaks the
                  YYYY-MM-DD the API already expects. */}
              <Input
                id="campaign-start"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-end">End date *</Label>
              <Input
                id="campaign-end"
                type="date"
                min={startsOn || undefined}
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
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

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIndex(0)}>
              Back
            </Button>
            <Button type="button" className="flex-1" loading={saving} onClick={() => void completeFlight()}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {stepIndex === 2 && campaign ? (
        <div className="space-y-6">
          <CreativeUploadField
            campaignId={campaign.id}
            format={format}
            creatives={campaign.creatives}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIndex(1)}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={campaign.creatives.length === 0}
              onClick={() => setStepIndex(3)}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {stepIndex === 3 && campaign ? (
        <div className="space-y-6">
          <dl className="rounded-xl border bg-card p-4 text-sm">
            {[
              ["Campaign", campaign.name],
              ["Market", campaign.market ?? "—"],
              ["Format", FORMAT_LABELS[campaign.format as CampaignFormat] ?? campaign.format],
              ["Objective", campaign.objective ? (OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective) : "—"],
              ["Flight", campaign.starts_on && campaign.ends_on ? `${campaign.starts_on} → ${campaign.ends_on}` : "—"],
              ["Budget", campaign.budget_kes ? `KES ${Number(campaign.budget_kes).toLocaleString("en-KE")}` : "—"],
              ["Creative", `${campaign.creatives.length} file${campaign.creatives.length === 1 ? "" : "s"}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-sm text-muted-foreground">
            Submitting sends this to our team for review. You&apos;ll get an email and a
            notification when there&apos;s a decision, and you can&apos;t edit while it&apos;s in
            the queue.
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIndex(2)}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              loading={submit.isPending}
              loadingText="Submitting…"
              onClick={() => void handleSubmit()}
            >
              Submit for review
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
