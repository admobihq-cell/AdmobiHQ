import { useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"
import type { CampaignDto } from "@workspace/ops-contracts"

import { StatusBadge } from "@/components/ui/status-badge"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import {
  FlightCalendar,
  FlightListRow,
  IN_QUEUE_COLOR,
  type FlightPlanRange,
} from "@/components/calendar/flight-calendar"
import type { Flight } from "@/components/calendar/calendar-model"
import {
  addDays,
  formatDayHeading,
  parseDayIso,
  resolveFlight,
  toDayIso,
  type DayIso,
} from "@/lib/campaign-calendar"
import { formatCampaignError, useUpdateCampaign } from "@/lib/use-campaigns"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** The API answers 409 for anything else, so the calendar refuses the gesture
 * rather than showing a bar snap back a second later. */
const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

function toFlight(campaign: CampaignDto): Flight | null {
  const window = resolveFlight(campaign)
  if (!window) return null
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    flightPhase: campaign.flight_phase,
    market: campaign.market,
    editable: EDITABLE_STATUSES.has(campaign.status),
    startsOn: window.startsOn,
    endsOn: window.endsOn,
  }
}

export function CampaignCalendarView({ campaigns }: { campaigns: CampaignDto[] }) {
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useStyles()
  const update = useUpdateCampaign()

  const legend = [
    { label: "Live", color: colors.primary },
    { label: "Scheduled", color: `${colors.primary}73` },
    { label: "In queue", color: IN_QUEUE_COLOR },
    { label: "Needs changes", color: colors.danger },
    { label: "Draft", color: `${colors.mutedForeground}66` },
  ]

  const [selectedIso, setSelectedIso] = useState<DayIso>(() => toDayIso(new Date()))
  const [rangeStart, setRangeStart] = useState<DayIso>(() => toDayIso(new Date()))
  const [rangeEnd, setRangeEnd] = useState<DayIso>(() => toDayIso(new Date()))

  const flights = useMemo(
    () => campaigns.map(toFlight).filter((flight): flight is Flight => flight !== null),
    [campaigns],
  )

  const unscheduled = useMemo(
    () => campaigns.filter((campaign) => !resolveFlight(campaign)),
    [campaigns],
  )

  const selectedFlights = useMemo(
    () => flights.filter((f) => selectedIso >= f.startsOn && selectedIso <= f.endsOn),
    [flights, selectedIso],
  )

  const inViewFlights = useMemo(
    () => flights.filter((f) => f.startsOn <= rangeEnd && f.endsOn >= rangeStart),
    [flights, rangeEnd, rangeStart],
  )

  function reschedule(id: number, startsOn: DayIso, endsOn: DayIso) {
    update.mutate({ id, data: { starts_on: startsOn, ends_on: endsOn } })
  }

  function moveFlight(id: number, dayDelta: number) {
    const flight = flights.find((f) => f.id === id)
    if (!flight || dayDelta === 0) return
    reschedule(
      id,
      toDayIso(addDays(parseDayIso(flight.startsOn), dayDelta)),
      toDayIso(addDays(parseDayIso(flight.endsOn), dayDelta)),
    )
  }

  function resizeFlight(id: number, edge: "start" | "end", dayDelta: number) {
    const flight = flights.find((f) => f.id === id)
    if (!flight || dayDelta === 0) return
    let start = flight.startsOn
    let end = flight.endsOn
    if (edge === "start") {
      start = toDayIso(addDays(parseDayIso(flight.startsOn), dayDelta))
      if (start > end) start = end
    } else {
      end = toDayIso(addDays(parseDayIso(flight.endsOn), dayDelta))
      if (end < start) end = start
    }
    reschedule(id, start, end)
  }

  function planRange(range: FlightPlanRange) {
    setSelectedIso(range.startsOn)
    router.push({
      pathname: "/campaigns/new",
      params: { startsOn: range.startsOn, endsOn: range.endsOn },
    })
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
        <Text style={styles.legendHint}>
          Long-press a draft to drag it · long-press a day to plan. Campaigns in review or
          approved are locked.
        </Text>
      </View>

      {update.error ? <ApiErrorBanner message={formatCampaignError(update.error)} /> : null}

      <FlightCalendar
        flights={flights}
        selectedIso={selectedIso}
        onSelectDay={setSelectedIso}
        onDatesChange={(start, end) => {
          setRangeStart(start)
          setRangeEnd(end)
        }}
        onPlanRange={planRange}
        onMoveFlight={moveFlight}
        onResizeFlight={resizeFlight}
      />

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{formatDayHeading(selectedIso)}</Text>
          <Pressable
            style={styles.planButton}
            onPress={() => planRange({ startsOn: selectedIso, endsOn: selectedIso })}
          >
            <Text style={styles.planButtonText}>Plan</Text>
          </Pressable>
        </View>
        {selectedFlights.length === 0 ? (
          <Text style={styles.empty}>No flights on this day.</Text>
        ) : (
          selectedFlights.map((flight) => <FlightListRow key={flight.id} flight={flight} />)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In view · {inViewFlights.length}</Text>
        {inViewFlights.length === 0 ? (
          <Text style={styles.empty}>Nothing booked in this range yet.</Text>
        ) : (
          inViewFlights.map((flight) => <FlightListRow key={flight.id} flight={flight} />)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unscheduled · {unscheduled.length}</Text>
        {unscheduled.length === 0 ? (
          <Text style={styles.empty}>Every campaign has a flight window.</Text>
        ) : (
          unscheduled.map((campaign) => {
            const editable = EDITABLE_STATUSES.has(campaign.status)
            return (
              <View key={campaign.id} style={styles.unscheduledRow}>
                <View style={styles.unscheduledHead}>
                  <Text style={styles.unscheduledName} numberOfLines={1}>
                    {campaign.name}
                  </Text>
                  <StatusBadge status={campaign.status} flightPhase={campaign.flight_phase} />
                </View>
                <Text style={styles.unscheduledMeta} numberOfLines={1}>
                  {campaign.market ?? "Market not set"}
                </Text>
                <Pressable
                  style={[styles.placeButton, !editable && styles.placeButtonDisabled]}
                  disabled={!editable || update.isPending}
                  onPress={() => reschedule(campaign.id, selectedIso, selectedIso)}
                >
                  <Text style={styles.placeButtonText}>
                    {editable ? `Start on ${formatDayHeading(selectedIso)}` : "Locked for review"}
                  </Text>
                </Pressable>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

function useStyles() {
  return useThemedStyles((c) => ({
    wrap: { gap: spacing.lg },
    legend: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    legendItem: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { ...typography.caption, color: c.mutedForeground },
    legendHint: { ...typography.caption, color: c.mutedForeground, width: "100%" as const },
    section: { gap: spacing.sm },
    sectionHead: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    sectionTitle: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    planButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.primary,
    },
    planButtonText: {
      ...typography.label,
      color: c.primaryForeground,
      fontWeight: "700" as const,
    },
    empty: { ...typography.bodySm, color: c.mutedForeground },
    unscheduledRow: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    unscheduledHead: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    unscheduledName: { ...typography.label, color: c.text, fontWeight: "600" as const, flex: 1 },
    unscheduledMeta: { ...typography.caption, color: c.mutedForeground },
    placeButton: {
      marginTop: spacing.xs,
      alignItems: "center" as const,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    placeButtonDisabled: { opacity: 0.5 },
    placeButtonText: { ...typography.label, color: c.text, fontWeight: "600" as const },
  }))
}
