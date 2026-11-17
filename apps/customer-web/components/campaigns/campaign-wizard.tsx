"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CAMPAIGN_FORMATS,
  CAMPAIGN_MARKETS,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_OBJECTIVE_LABELS,
  creativesForPanel,
  describeCampaignObjectives,
  joinCampaignList,
  missingPanels,
  specsForFormat,
  splitCampaignList,
  toggleCampaignListItem,
  type CampaignCreativeDto,
  type CampaignDto,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Stepper, type StepperStep } from "@workspace/ui/components/stepper"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { CampaignBudgetEstimator } from "@/components/campaigns/campaign-budget-estimator"
import { CreativeUploadField } from "@/components/campaigns/creative-upload-field"
import {
  useCampaign,
  useCreateCampaign,
  useCheckoutCampaign,
  useSubmitCampaign,
  useUpdateCampaign,
} from "@/lib/use-campaigns"
import { dueKesOf } from "@/lib/campaigns-client"
import { useFinanceSummary } from "@/lib/use-analytics"
import { useOrgPermissions } from "@/lib/use-org"

const FORMAT_LABELS: Record<CampaignFormat, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Both panels",
}

const STEP_LABELS = ["Brief", "Flight & budget", "Creative", "Review"]

const AUTOSAVE_MS = 800

/** Which steps are satisfied by the campaign as it stands, so someone
 * resuming a draft lands on the first thing actually missing rather than
 * back at step one. */
function stepCompletion(campaign: CampaignDto | null): [boolean, boolean, boolean] {
  if (!campaign) return [false, false, false]
  return [
    Boolean(campaign.name && campaign.market && campaign.format),
    Boolean(campaign.budget_kes && campaign.starts_on && campaign.ends_on),
    // "Both panels" needs art for each shape, so one file isn't enough.
    missingPanels(campaign.format as CampaignFormat, campaign.creatives).length === 0,
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

/** Several can be on at once — a campaign can run in more than one market and
 * serve more than one purpose. aria-pressed tells a screen reader which are on. */
function MultiChoiceRow<T extends string>({
  options,
  values,
  onToggle,
  labels,
}: {
  options: readonly T[]
  values: string[]
  onToggle: (option: T) => void
  labels?: Record<string, string>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = values.includes(option)
        return (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn(!active && "text-muted-foreground")}
            aria-pressed={active}
            onClick={() => onToggle(option)}
          >
            {labels?.[option] ?? option}
          </Button>
        )
      })}
    </div>
  )
}

/** Remounts on step change so the same Sheet-style enter motion the driver
 * profile flow uses also plays when advancing through the wizard. */
function StepPanel({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 duration-200 ease-out animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none">
      {children}
    </div>
  )
}

function DraftActions({
  onSaveDraft,
  saving,
  draftSaving,
  primary,
}: {
  onSaveDraft: () => void
  saving: boolean
  draftSaving: boolean
  primary?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        className="sm:flex-1"
        loading={draftSaving}
        loadingText="Saving draft…"
        disabled={saving}
        onClick={() => void onSaveDraft()}
      >
        Save as draft
      </Button>
      {primary}
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
  const checkout = useCheckoutCampaign()
  // The server enforces campaigns:submit; hiding it here stops a Member from
  // filling in the whole wizard only to be refused at the last click.
  const { can } = useOrgPermissions()
  const canSubmit = can("campaigns:submit")
  // Display only: the server decides (submit 402 / checkout 409 carry the real `dueKes`).
  const finance = useFinanceSummary({ range: "30d" }, { enabled: can("billing:read") })
  const [serverDueKes, setServerDueKes] = useState<number | null>(null)

  const [campaign, setCampaign] = useState<CampaignDto | null>(initialCampaign)
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteStep(initialCampaign))

  const [name, setName] = useState(initialCampaign?.name ?? "")
  const [markets, setMarkets] = useState<string[]>(() => splitCampaignList(initialCampaign?.market))
  const [format, setFormat] = useState<CampaignFormat>(
    (initialCampaign?.format as CampaignFormat) ?? "taxi_top",
  )
  const [objectives, setObjectives] = useState<string[]>(() =>
    splitCampaignList(initialCampaign?.objective),
  )
  const market = joinCampaignList(markets)
  const [corridors, setCorridors] = useState(initialCampaign?.corridors ?? "")
  const [budget, setBudget] = useState(initialCampaign?.budget_kes ?? "")
  const [startsOn, setStartsOn] = useState(initialCampaign?.starts_on ?? initialStartsOn ?? "")
  const [endsOn, setEndsOn] = useState(initialCampaign?.ends_on ?? initialEndsOn ?? "")
  const [error, setError] = useState<string | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    initialCampaign ? Date.now() : null,
  )

  const campaignIdRef = useRef<number | null>(initialCampaign?.id ?? null)
  const creating = useRef<Promise<CampaignDto> | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextAutosave = useRef(true)

  // Upload/delete invalidate the detail query; keep creatives on the local
  // snapshot so Continue unlocks immediately after upload.
  const liveCampaign = useCampaign(campaign?.id ?? null)
  useEffect(() => {
    if (!liveCampaign.data) return
    setCampaign((prev) => {
      if (!prev || prev.id !== liveCampaign.data.id) return liveCampaign.data
      return { ...prev, creatives: liveCampaign.data.creatives }
    })
  }, [liveCampaign.data])

  // Put the draft id in the URL so a refresh reloads the same campaign and
  // resumes at the first incomplete step.
  useEffect(() => {
    if (!campaign?.id) return
    const url = new URL(window.location.href)
    if (url.searchParams.get("id") === String(campaign.id)) return
    url.searchParams.set("id", String(campaign.id))
    router.replace(`${url.pathname}?${url.searchParams.toString()}`)
  }, [campaign?.id, router])

  function setCreatives(creatives: CampaignCreativeDto[]) {
    setCampaign((prev) => (prev ? { ...prev, creatives } : prev))
  }

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
  const missing = campaign ? missingPanels(format, campaign.creatives) : []
  const missingLabels = missing.map((spec) => spec.label).join(" and ")
  const saving = create.isPending || update.isPending

  /** Partial body the API accepts for create/PATCH — only include fields the
   * advertiser has actually filled so an early draft doesn't wipe later ones. */
  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: name.trim() || "Untitled campaign",
      format,
    }
    if (market) payload.market = market
    if (objectives.length) payload.objective = joinCampaignList(objectives)
    if (corridors.trim()) payload.corridors = corridors.trim()

    const budgetKes = Number(String(budget).replace(/[^0-9.]/g, ""))
    if (budgetKes > 0) payload.budget_kes = budgetKes
    if (startsOn) payload.starts_on = startsOn
    if (endsOn) payload.ends_on = endsOn
    return payload
  }

  async function persist(data: Record<string, unknown>): Promise<CampaignDto | null> {
    try {
      // Read the id from a ref, not `campaign` state: state only updates after
      // the create returns, so a save fired meanwhile (autosave timer, Continue)
      // would see null and create a duplicate. Wait for the in-flight create.
      if (!campaignIdRef.current && creating.current) await creating.current
      if (!campaignIdRef.current) {
        const request = create
          .mutateAsync({ name: String(data.name), ...data } as never)
          .then((created) => {
            campaignIdRef.current = created.id
            return created
          })
        creating.current = request
        try {
          const created = await request
          setCampaign(created)
          setLastSavedAt(Date.now())
          return created
        } finally {
          creating.current = null
        }
      }
      const updated = await update.mutateAsync({ id: campaignIdRef.current, data: data as never })
      setCampaign(updated)
      setLastSavedAt(Date.now())
      return updated
    } catch {
      return null
    }
  }

  /** Creates or updates the draft without advancing steps. Used by autosave
   * and the explicit "Save as draft" actions. */
  async function saveDraft(options?: { exit?: boolean; silent?: boolean }): Promise<boolean> {
    if (!name.trim() && !campaign) {
      if (!options?.silent) setError("Give this campaign a name before saving a draft.")
      return false
    }
    setError(null)
    setDraftSaving(true)
    skipNextAutosave.current = true
    const saved = await persist(buildPayload())
    setDraftSaving(false)
    if (!saved) return false

    if (!options?.silent) {
      toast.success(options?.exit ? "Draft saved — you can finish it later" : "Draft saved")
    }
    if (options?.exit) router.push("/campaigns")
    return true
  }

  // Once a draft exists (or as soon as there's a name to create one), keep the
  // server copy current so a refresh doesn't throw away in-progress fields.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false
      return
    }
    if (!name.trim() && !campaign) return

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      void persist(buildPayload())
    }, AUTOSAVE_MS)

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
    // Intentionally depend on the form fields, not persist/buildPayload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, market, format, objectives, corridors, budget, startsOn, endsOn])

  async function completeBrief() {
    if (!name.trim()) return setError("Give this campaign a name.")
    if (!market) return setError("Pick at least one market.")
    setError(null)
    skipNextAutosave.current = true
    const saved = await persist({
      name: name.trim(),
      market,
      format,
      ...(objectives.length ? { objective: joinCampaignList(objectives) } : {}),
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
    skipNextAutosave.current = true
    const saved = await persist({ budget_kes: budgetKes, starts_on: startsOn, ends_on: endsOn })
    if (saved) setStepIndex(2)
  }

  const budgetKesValue = Number(String(budget).replace(/[^0-9.]/g, "") || 0)
  const availableKes = finance.data?.availableKes
  // A funded campaign (resubmit after changes) owes nothing. Otherwise the
  // server's figure wins; without billing access we only learn it on submit.
  const dueKes = campaign?.funded_at
    ? 0
    : serverDueKes ??
      (availableKes == null ? null : Math.max(0, Math.round((budgetKesValue - Math.max(0, availableKes)) * 100) / 100))
  const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`
  const submitLabel = campaign?.funded_at
    ? "Submit for review"
    : dueKes == null
      ? "Submit for review"
      : dueKes > 0
        ? `Pay ${kes(dueKes)} and submit`
        : `Submit (${kes(budgetKesValue)} from your balance)`

  async function handleSubmit() {
    if (!campaign) return
    skipNextAutosave.current = true
    await persist(buildPayload())
    if (dueKes != null && dueKes > 0) return checkout.mutate(campaign.id)
    const result = await submit.mutateAsync(campaign.id).catch((error: unknown) => {
      // The balance didn't cover it after all: show what's due and offer to pay.
      const due = dueKesOf(error)
      if (due != null) setServerDueKes(due)
      return null
    })
    if (result) router.push(`/campaigns/${campaign.id}`)
  }

  const draftHint = campaign?.id ? (
    <p className="text-center text-xs text-muted-foreground">
      Draft #{campaign.id}
      {lastSavedAt ? " · progress is saved — refresh-safe" : null}
    </p>
  ) : (
    <p className="text-center text-xs text-muted-foreground">
      Name the campaign to start a draft. Everything after that survives a refresh.
    </p>
  )

  return (
    <div className="w-full space-y-8">
      {/* Pinned under FlowChrome's h-14 bar so the step names stay on screen
          while a long step scrolls. -mx cancels the page gutter so the
          background covers the content scrolling beneath it. */}
      <div className="sticky top-14 z-10 -mx-4 -mt-4 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
        <Stepper steps={steps} />
      </div>
      <div className="space-y-3">
        <p className="text-center text-xs font-medium text-muted-foreground">
          {progressPercent}% complete
          {progressPercent > 0 && progressPercent < 100 ? " — almost there!" : ""}
        </p>
        {draftHint}
      </div>

      {stepIndex === 0 ? (
        <StepPanel>
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
            <Label>Markets *</Label>
            <MultiChoiceRow
              options={CAMPAIGN_MARKETS}
              values={markets}
              onToggle={(option) => setMarkets((prev) => toggleCampaignListItem(CAMPAIGN_MARKETS, prev, option))}
            />
            <p className="text-xs text-muted-foreground">Pick every market this campaign runs in.</p>
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
            <Label>Objectives</Label>
            <MultiChoiceRow
              options={CAMPAIGN_OBJECTIVES}
              values={objectives}
              onToggle={(option) =>
                setObjectives((prev) => toggleCampaignListItem(CAMPAIGN_OBJECTIVES, prev, option))
              }
              labels={CAMPAIGN_OBJECTIVE_LABELS}
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

          <DraftActions
            onSaveDraft={() => saveDraft({ exit: true })}
            saving={saving}
            draftSaving={draftSaving}
            primary={
              <Button
                type="button"
                className="sm:flex-1"
                loading={saving && !draftSaving}
                onClick={() => void completeBrief()}
              >
                Continue
              </Button>
            }
          />
        </StepPanel>
      ) : null}

      {stepIndex === 1 ? (
        <StepPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-start">Start date *</Label>
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

          <section className="space-y-4 border-t border-border pt-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">Not sure what to budget?</h2>
              <p className="text-sm text-muted-foreground">
                Priced on the same rate card the pricing page quotes, against the market and
                format you picked in step one.
              </p>
            </div>
            <CampaignBudgetEstimator
              format={format}
              market={market || null}
              startsOn={startsOn}
              endsOn={endsOn}
              onApply={(total) => setBudget(String(Math.round(total)))}
            />
            <p className="text-xs text-muted-foreground">
              Indicative only — your account manager confirms the final rate against corridor and
              loop capacity during review.
            </p>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIndex(0)}>
              Back
            </Button>
          </div>
          <DraftActions
            onSaveDraft={() => saveDraft({ exit: true })}
            saving={saving}
            draftSaving={draftSaving}
            primary={
              <Button
                type="button"
                className="sm:flex-1"
                loading={saving && !draftSaving}
                onClick={() => void completeFlight()}
              >
                Continue
              </Button>
            }
          />
        </StepPanel>
      ) : null}

      {stepIndex === 2 && campaign ? (
        <StepPanel>
          <CreativeUploadField
            campaignId={campaign.id}
            format={format}
            creatives={campaign.creatives}
            onCreativesChange={setCreatives}
          />
          <p className="text-xs text-muted-foreground">
            {missing.length > 0
              ? `Still needed before you can submit: ${missingLabels}. You can save a draft without it and come back.`
              : "Artwork is in for every panel."}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIndex(1)}>
              Back
            </Button>
          </div>
          <DraftActions
            onSaveDraft={() => saveDraft({ exit: true })}
            saving={saving}
            draftSaving={draftSaving}
            primary={
              <Button
                type="button"
                className="sm:flex-1"
                onClick={() => setStepIndex(3)}
              >
                {missing.length > 0 ? "Skip to review" : "Continue"}
              </Button>
            }
          />
        </StepPanel>
      ) : null}

      {stepIndex === 3 && campaign ? (
        <StepPanel>
          <dl className="rounded-xl border bg-card p-4 text-sm">
            {[
              ["Campaign", name.trim() || campaign.name],
              ["Markets", market || campaign.market || "—"],
              ["Format", FORMAT_LABELS[format] ?? format],
              ["Objectives", describeCampaignObjectives(joinCampaignList(objectives))],
              [
                "Flight",
                startsOn && endsOn ? `${startsOn} → ${endsOn}` : "Not scheduled yet",
              ],
              [
                "Budget",
                budget
                  ? `KES ${Number(String(budget).replace(/[^0-9.]/g, "") || 0).toLocaleString("en-KE")}`
                  : "—",
              ],
              [
                "Creative",
                specsForFormat(format).length > 1
                  ? specsForFormat(format)
                      .map(
                        (spec) =>
                          `${spec.label}: ${creativesForPanel(spec.format, campaign.creatives).length}`,
                      )
                      .join(" · ")
                  : `${campaign.creatives.length} file${campaign.creatives.length === 1 ? "" : "s"}`,
              ],
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
            Not ready yet? Save as draft and pick it up later from Campaigns. Submitting sends this
            to our team for review — you can&apos;t edit while it&apos;s in the queue.
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIndex(2)}>
              Back
            </Button>
          </div>
          <DraftActions
            onSaveDraft={() => saveDraft({ exit: true })}
            saving={saving || submit.isPending || checkout.isPending}
            draftSaving={draftSaving}
            primary={
              canSubmit ? (
                <Button
                  type="button"
                  className="sm:flex-1"
                  loading={submit.isPending || checkout.isPending || checkout.isSuccess}
                  loadingText={dueKes ? "Opening payment…" : "Submitting…"}
                  disabled={missing.length > 0}
                  onClick={() => void handleSubmit()}
                >
                  {submitLabel}
                </Button>
              ) : undefined
            }
          />
          {canSubmit && dueKes != null && dueKes > 0 ? (
            <p className="text-xs text-muted-foreground">
              Paid by M-Pesa or card through Paystack. M-Pesa is limited per transaction by Safaricom;
              use a card for larger amounts.
            </p>
          ) : null}
          {!canSubmit ? (
            <p className="text-xs text-muted-foreground">
              Your role can draft campaigns but not submit them — submitting commits spend. Save the
              draft and ask an organization admin to send it for review.
            </p>
          ) : missing.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Add artwork for {missingLabels} before submitting for review.
            </p>
          ) : null}
        </StepPanel>
      ) : null}
    </div>
  )
}
