import { useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  CAMPAIGN_FORMATS,
  CAMPAIGN_OBJECTIVES,
  type CampaignDto,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { CampaignBudgetEstimator } from "@/components/campaigns/campaign-budget-estimator"
import { CreativePicker } from "@/components/campaigns/creative-picker"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { formatFlightDates } from "@/lib/campaign-calendar"
import {
  formatCampaignError,
  useCreateCampaign,
  useSubmitCampaign,
  useUpdateCampaign,
} from "@/lib/use-campaigns"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

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

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Which steps the campaign already satisfies, so someone resuming a
 * "changes requested" campaign lands on the first thing actually missing
 * rather than back at step one. */
function stepCompletion(campaign: CampaignDto | null): [boolean, boolean, boolean] {
  if (!campaign) return [false, false, false]
  return [
    Boolean(campaign.name && campaign.market && campaign.format),
    Boolean(campaign.budget_kes && campaign.starts_on && campaign.ends_on),
    campaign.creatives.length > 0,
  ]
}

function firstIncompleteStep(campaign: CampaignDto | null): number {
  const index = stepCompletion(campaign).findIndex((complete) => !complete)
  return index === -1 ? 3 : index
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
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

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
  const progressPercent = Math.round((done.filter(Boolean).length / 3) * 100)
  const saving = create.isPending || update.isPending

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.lg },
    steps: { flexDirection: "row" as const, gap: spacing.xs },
    stepPip: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.border },
    stepPipDone: { backgroundColor: c.primary },
    stepHead: { gap: 2 },
    stepName: { ...typography.section, color: c.text },
    stepProgress: { ...typography.caption, color: c.mutedForeground },
    fieldGroup: { gap: spacing.sm },
    label: { ...typography.label, color: c.text },
    hint: { ...typography.caption, color: c.mutedForeground },
    input: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.surface,
    },
    inputMultiline: { minHeight: 84, textAlignVertical: "top" as const },
    dateRow: { flexDirection: "row" as const, gap: spacing.sm },
    dateCol: { flex: 1, gap: spacing.xs },
    chipGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { ...typography.label, color: c.mutedForeground, fontWeight: "600" as const },
    chipTextActive: { color: c.primaryForeground },
    summary: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: spacing.md,
    },
    summaryRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    summaryRowLast: { borderBottomWidth: 0 },
    summaryLabel: { ...typography.bodySm, color: c.mutedForeground },
    summaryValue: {
      ...typography.bodySm,
      color: c.text,
      fontWeight: "600" as const,
      flexShrink: 1,
      textAlign: "right" as const,
    },
    actions: { flexDirection: "row" as const, gap: spacing.sm },
    primary: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
    },
    primaryText: { ...typography.body, fontWeight: "700" as const, color: c.primaryForeground },
    secondary: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
    },
    secondaryText: { ...typography.body, fontWeight: "600" as const, color: c.text },
    disabled: { opacity: 0.6 },
  }))

  /** The draft is created on leaving step 1 and PATCHed on every step after,
   * so a half-finished campaign survives the app being closed instead of
   * living only in this component's state. */
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
    if (!DAY_PATTERN.test(startsOn) || !DAY_PATTERN.test(endsOn)) {
      return setError("Use YYYY-MM-DD for both dates.")
    }
    if (endsOn < startsOn) return setError("The flight can't end before it starts.")
    setError(null)
    const saved = await persist({ budget_kes: budgetKes, starts_on: startsOn, ends_on: endsOn })
    if (saved) setStepIndex(2)
  }

  async function handleSubmit() {
    if (!campaign) return
    const result = await submit.mutateAsync(campaign.id).catch(() => null)
    if (result) router.replace(`/campaigns/${campaign.id}`)
  }

  const flightLabel =
    campaign?.starts_on && campaign.ends_on
      ? formatFlightDates(campaign.starts_on, campaign.ends_on)
      : "—"

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.steps}>
        {STEP_LABELS.map((label, index) => (
          <View
            key={label}
            style={[styles.stepPip, index <= stepIndex && styles.stepPipDone]}
          />
        ))}
      </View>
      <View style={styles.stepHead}>
        <Text style={styles.stepName}>
          Step {stepIndex + 1} of {STEP_LABELS.length} · {STEP_LABELS[stepIndex]}
        </Text>
        <Text style={styles.stepProgress}>
          {progressPercent}% complete
          {progressPercent > 0 && progressPercent < 100 ? " — almost there!" : ""}
        </Text>
      </View>

      {stepIndex === 0 ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Campaign name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Kilimani Launch Week"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Market *</Text>
            <View style={styles.chipGrid}>
              {MARKETS.map((option) => {
                const active = option === market
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setMarket(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Format</Text>
            <View style={styles.chipGrid}>
              {CAMPAIGN_FORMATS.map((option) => {
                const active = option === format
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFormat(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {FORMAT_LABELS[option]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Objective</Text>
            <View style={styles.chipGrid}>
              {CAMPAIGN_OBJECTIVES.map((option) => {
                const active = option === objective
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setObjective(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {OBJECTIVE_LABELS[option] ?? option}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Corridors or routes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={corridors}
              onChangeText={setCorridors}
              placeholder="Anything specific your account manager should know"
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </View>
        </>
      ) : null}

      {stepIndex === 1 ? (
        <>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.label}>Start date *</Text>
              <TextInput
                style={styles.input}
                value={startsOn}
                onChangeText={setStartsOn}
                placeholder="2026-10-01"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
              />
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.label}>End date *</Text>
              <TextInput
                style={styles.input}
                value={endsOn}
                onChangeText={setEndsOn}
                placeholder="2026-10-31"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
              />
            </View>
          </View>
          {/* No date-picker dependency: the calendar tab is the visual way to
              pick a window, and it deep-links here with both dates filled in.
              These fields speak the YYYY-MM-DD the API already expects. */}
          <Text style={styles.hint}>
            Dates are YYYY-MM-DD. Planning from the calendar fills these in for you.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget (KES) *</Text>
            <TextInput
              style={styles.input}
              value={String(budget)}
              onChangeText={setBudget}
              placeholder="e.g. 120000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Not sure what to budget?</Text>
            <Text style={styles.hint}>
              Priced on the same rate card the website quotes, against the market and format you
              picked in step one.
            </Text>
            <CampaignBudgetEstimator
              format={format}
              market={market}
              startsOn={startsOn}
              endsOn={endsOn}
              onApply={(total) => setBudget(String(Math.round(total)))}
            />
            <Text style={styles.hint}>
              Indicative only — your account manager confirms the final rate during review.
            </Text>
          </View>
        </>
      ) : null}

      {stepIndex === 2 && campaign ? (
        <CreativePicker
          campaignId={campaign.id}
          format={format}
          creatives={campaign.creatives}
        />
      ) : null}

      {stepIndex === 3 && campaign ? (
        <>
          <View style={styles.summary}>
            {(
              [
                ["Campaign", campaign.name],
                ["Market", campaign.market ?? "—"],
                ["Format", FORMAT_LABELS[campaign.format as CampaignFormat] ?? campaign.format],
                [
                  "Objective",
                  campaign.objective
                    ? (OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective)
                    : "—",
                ],
                ["Flight", flightLabel],
                [
                  "Budget",
                  campaign.budget_kes
                    ? `KES ${Number(campaign.budget_kes).toLocaleString("en-KE")}`
                    : "—",
                ],
                [
                  "Creative",
                  `${campaign.creatives.length} file${campaign.creatives.length === 1 ? "" : "s"}`,
                ],
              ] as Array<[string, string]>
            ).map(([label, value], index, rows) => (
              <View
                key={label}
                style={[styles.summaryRow, index === rows.length - 1 && styles.summaryRowLast]}
              >
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>
            Submitting sends this to our team for review. You&apos;ll get an email and a
            notification when there&apos;s a decision, and you can&apos;t edit while it&apos;s in
            the queue.
          </Text>
        </>
      ) : null}

      {error ? <ApiErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {create.error || update.error ? (
        <ApiErrorBanner message={formatCampaignError(create.error ?? update.error)} />
      ) : null}
      {submit.error ? <ApiErrorBanner message={formatCampaignError(submit.error)} /> : null}

      <View style={styles.actions}>
        {stepIndex > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.disabled]}
            onPress={() => setStepIndex(stepIndex - 1)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        ) : null}

        {stepIndex === 0 ? (
          <Pressable
            style={({ pressed }) => [styles.primary, (saving || pressed) && styles.disabled]}
            onPress={() => void completeBrief()}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryText}>Continue</Text>
            )}
          </Pressable>
        ) : null}

        {stepIndex === 1 ? (
          <Pressable
            style={({ pressed }) => [styles.primary, (saving || pressed) && styles.disabled]}
            onPress={() => void completeFlight()}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryText}>Continue</Text>
            )}
          </Pressable>
        ) : null}

        {stepIndex === 2 ? (
          <Pressable
            style={({ pressed }) => [
              styles.primary,
              ((campaign?.creatives.length ?? 0) === 0 || pressed) && styles.disabled,
            ]}
            onPress={() => setStepIndex(3)}
            disabled={(campaign?.creatives.length ?? 0) === 0}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        ) : null}

        {stepIndex === 3 ? (
          <Pressable
            style={({ pressed }) => [
              styles.primary,
              (submit.isPending || pressed) && styles.disabled,
            ]}
            onPress={() => void handleSubmit()}
            disabled={submit.isPending}
            accessibilityRole="button"
          >
            {submit.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryText}>Submit for review</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  )
}
