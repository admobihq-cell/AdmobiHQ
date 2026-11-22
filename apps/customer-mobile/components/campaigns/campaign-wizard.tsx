import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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
import { useOrgPermissions } from "@/lib/use-org"
import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { checkoutCampaign, dueKesOf, owedKesOf, payWithPaystack } from "@/lib/payments"

const FORMAT_LABELS: Record<CampaignFormat, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Both panels",
}

const STEP_LABELS = ["Brief", "Flight & budget", "Creative", "Review"]
// "Flight & budget" doesn't fit a quarter of a 360dp screen on one line.
const SHORT_STEP_LABELS = ["Brief", "Flight", "Creative", "Review"]

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Which steps the campaign already satisfies, so someone resuming a
 * "changes requested" campaign lands on the first thing actually missing
 * rather than back at step one. */
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
  const getToken = useTokenGetter()
  const queryClient = useQueryClient()
  // The server enforces campaigns:submit; hiding it here stops a Member from
  // filling in the whole wizard only to be refused at the last step.
  const { can } = useOrgPermissions()
  const canSubmit = can("campaigns:submit")

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

  const done = stepCompletion(campaign)
  const progressPercent = Math.round((done.filter(Boolean).length / 3) * 100)
  const missing = campaign ? missingPanels(format, campaign.creatives) : []
  const missingLabels = missing.map((spec) => spec.label).join(" and ")
  const saving = create.isPending || update.isPending

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.bg },
    header: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.lg },
    steps: { flexDirection: "row" as const, gap: spacing.xs },
    stepCol: { flex: 1, gap: 6 },
    stepPip: { height: 4, borderRadius: 2, backgroundColor: c.border },
    stepPipDone: { backgroundColor: c.primary },
    stepPipLabel: { ...typography.caption, color: c.mutedForeground },
    stepPipLabelCurrent: { color: c.text, fontWeight: "700" as const },
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
    submitBlockedHint: { ...typography.caption, color: c.mutedForeground },
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
    if (!market) return setError("Pick at least one market.")
    setError(null)
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
    if (!DAY_PATTERN.test(startsOn) || !DAY_PATTERN.test(endsOn)) {
      return setError("Use YYYY-MM-DD for both dates.")
    }
    if (endsOn < startsOn) return setError("The flight can't end before it starts.")
    setError(null)
    const saved = await persist({ budget_kes: budgetKes, starts_on: startsOn, ends_on: endsOn })
    if (saved) setStepIndex(2)
  }

  const [paying, setPaying] = useState(false)

  /** The balance didn't cover the budget: confirm, pay through Paystack, and the server submits. */
  function payAndSubmit(campaignId: number, dueKes: number, owedKes: number) {
    const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`
    Alert.alert(
      `Pay ${kes(dueKes)} and submit?`,
      `${owedKes > 0 ? `This includes ${kes(owedKes)} your account owes: your balance is below zero. ` : "Your balance doesn't cover this budget. "}Pay by M-Pesa or card through Paystack. M-Pesa is limited per transaction by Safaricom; use a card for larger amounts.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Pay and submit",
          onPress: () => {
            setPaying(true)
            void (async () => {
              try {
                const status = await payWithPaystack(getToken, await checkoutCampaign(getToken, campaignId))
                void queryClient.invalidateQueries()
                if (status === "success") return router.replace(`/campaigns/${campaignId}`)
                Alert.alert(
                  status === "pending" ? "Still confirming your payment" : "Payment didn't go through",
                  status === "pending"
                    ? "We'll submit your campaign and notify you as soon as the payment lands."
                    : "Nothing was charged. You can try again.",
                )
              } catch (error) {
                Alert.alert("Couldn't start the payment", error instanceof Error ? error.message : "Try again.")
              } finally {
                setPaying(false)
              }
            })()
          },
        },
      ],
    )
  }

  async function handleSubmit() {
    if (!campaign) return
    const result = await submit.mutateAsync(campaign.id).catch((error: unknown) => {
      const due = dueKesOf(error)
      if (due != null && due > 0) payAndSubmit(campaign.id, due, owedKesOf(error))
      return null
    })
    if (result) router.replace(`/campaigns/${campaign.id}`)
  }

  const flightLabel =
    campaign?.starts_on && campaign.ends_on
      ? formatFlightDates(campaign.starts_on, campaign.ends_on)
      : "—"

  return (
    <View style={styles.screen}>
      {/* Outside the ScrollView on purpose: the step names stay pinned while a
          long step scrolls underneath. */}
      <View style={styles.header} accessibilityRole="progressbar" accessibilityLabel={`Step ${stepIndex + 1} of ${STEP_LABELS.length}, ${STEP_LABELS[stepIndex]}`}>
        <View style={styles.steps}>
          {STEP_LABELS.map((label, index) => (
            <View key={label} style={styles.stepCol}>
              <View style={[styles.stepPip, index <= stepIndex && styles.stepPipDone]} />
              <Text
                style={[styles.stepPipLabel, index === stepIndex && styles.stepPipLabelCurrent]}
                numberOfLines={1}
              >
                {SHORT_STEP_LABELS[index]}
              </Text>
            </View>
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
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

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
              <Text style={styles.label}>Markets *</Text>
              <Text style={styles.hint}>Pick every market this campaign runs in.</Text>
              <View style={styles.chipGrid}>
                {CAMPAIGN_MARKETS.map((option) => {
                  const active = markets.includes(option)
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() =>
                        setMarkets((prev) => toggleCampaignListItem(CAMPAIGN_MARKETS, prev, option))
                      }
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
              <Text style={styles.label}>Objectives</Text>
              <View style={styles.chipGrid}>
                {CAMPAIGN_OBJECTIVES.map((option) => {
                  const active = objectives.includes(option)
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() =>
                        setObjectives((prev) =>
                          toggleCampaignListItem(CAMPAIGN_OBJECTIVES, prev, option),
                        )
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {CAMPAIGN_OBJECTIVE_LABELS[option]}
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
                market={market || null}
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
                  ["Markets", campaign.market ?? "—"],
                  ["Format", FORMAT_LABELS[campaign.format as CampaignFormat] ?? campaign.format],
                  ["Objectives", describeCampaignObjectives(campaign.objective)],
                  ["Flight", flightLabel],
                  [
                    "Budget",
                    campaign.budget_kes
                      ? `KES ${Number(campaign.budget_kes).toLocaleString("en-KE")}`
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
                          .join("\n")
                      : `${campaign.creatives.length} file${campaign.creatives.length === 1 ? "" : "s"}`,
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
              {missing.length > 0
                ? `Add artwork for ${missingLabels} before you can submit. `
                : ""}
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
        {submit.error && dueKesOf(submit.error) == null ? (
          <ApiErrorBanner message={formatCampaignError(submit.error)} />
        ) : null}

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
                pressed && styles.disabled,
              ]}
              onPress={() => setStepIndex(3)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>
                {missing.length > 0 ? "Skip to review" : "Continue"}
              </Text>
            </Pressable>
          ) : null}

          {stepIndex === 3 && canSubmit ? (
            <Pressable
              style={({ pressed }) => [
                styles.primary,
                (submit.isPending || missing.length > 0 || pressed) && styles.disabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submit.isPending || paying || missing.length > 0}
              accessibilityRole="button"
            >
              {submit.isPending || paying ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryText}>Submit for review</Text>
              )}
            </Pressable>
          ) : null}

          {stepIndex === 3 && !canSubmit ? (
            <Text style={styles.submitBlockedHint}>
              Your role can draft campaigns but not submit them. Save the draft and ask an
              organization admin to send it for review.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}
