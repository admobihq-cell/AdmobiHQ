import { useMemo, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { formatFlightDates } from "@/lib/campaign-calendar"
import { createCampaign, formatLabelFor, type CampaignFormat } from "@/lib/campaigns"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const MARKETS = ["CBD", "Westlands", "Karen", "Kilimani", "Mombasa Rd", "Eastlands"] as const
const FORMATS: CampaignFormat[] = ["taxi_top", "delivery_bike", "both"]
const DURATIONS = ["1 day", "1 week", "1 month", "3 months"] as const

export default function NewCampaignScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  const params = useLocalSearchParams<{ startsOn?: string; endsOn?: string }>()
  const plannedStart = typeof params.startsOn === "string" ? params.startsOn : null
  const plannedEnd =
    typeof params.endsOn === "string" ? params.endsOn : plannedStart
  const plannedLabel = useMemo(
    () => (plannedStart && plannedEnd ? formatFlightDates(plannedStart, plannedEnd) : null),
    [plannedStart, plannedEnd],
  )

  const [name, setName] = useState("")
  const [market, setMarket] = useState<(typeof MARKETS)[number]>("CBD")
  const [format, setFormat] = useState<CampaignFormat>("taxi_top")
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("1 week")
  const [budget, setBudget] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.xl },
    intro: { gap: spacing.xs },
    introBody: { ...typography.bodySm, color: c.mutedForeground },
    plannedCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: `${c.primary}12`,
    },
    plannedLabelText: { ...typography.label, color: c.text, fontWeight: "700" as const },
    plannedCaption: { ...typography.caption, color: c.mutedForeground },
    fieldGroup: { gap: spacing.sm },
    label: { ...typography.label, color: c.text },
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
    chipGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      ...typography.label,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    chipTextActive: {
      color: c.primaryForeground,
    },
    errorText: {
      ...typography.bodySm,
      color: c.danger,
    },
    submit: {
      alignItems: "center" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
    },
    submitDisabled: { opacity: 0.6 },
    submitText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
  }))

  async function handleSubmit() {
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
      const created = await createCampaign({
        name: name.trim(),
        market: `${market} · new campaign`,
        format,
        budgetKes,
        duration,
        startsOn: plannedStart,
        endsOn: plannedEnd,
      })
      router.replace(`/campaigns/${created.id}`)
    } catch {
      setError("Couldn't save this campaign. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <Text style={styles.introBody}>
          Set the basics now — corridors, creative, and exact scheduling are confirmed with your
          account manager before a flight goes live.
        </Text>
      </View>

      {plannedLabel ? (
        <View style={styles.plannedCard}>
          <View>
            <Text style={styles.plannedCaption}>Flight window</Text>
            <Text style={styles.plannedLabelText}>{plannedLabel}</Text>
          </View>
          <Pressable onPress={() => router.setParams({ startsOn: "", endsOn: "" })}>
            <Text style={styles.plannedCaption}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

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
        <Text style={styles.label}>Market</Text>
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Format</Text>
        <View style={styles.chipGrid}>
          {FORMATS.map((option) => {
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
                  {formatLabelFor(option)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={[styles.fieldGroup, plannedLabel && { display: "none" }]}>
        <Text style={styles.label}>Flight length</Text>
        <View style={styles.chipGrid}>
          {DURATIONS.map((option) => {
            const active = option === duration
            return (
              <Pressable
                key={option}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDuration(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Budget (KES) *</Text>
        <TextInput
          style={styles.input}
          value={budget}
          onChangeText={setBudget}
          placeholder="e.g. 120000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.submit,
          submitting && styles.submitDisabled,
          pressed && !submitting && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.submitText}>Create campaign</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
