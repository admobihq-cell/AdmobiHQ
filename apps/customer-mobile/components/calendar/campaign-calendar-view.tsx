import { useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"

import { StatusBadge } from "@/components/ui/status-badge"
import {
  FlightCalendar,
  FlightListRow,
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
import {
  rescheduleCampaign,
  scheduleCampaign,
  type Campaign,
} from "@/lib/campaigns"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const LEGEND = [
  { label: "Active", key: "active" },
  { label: "Scheduled", key: "scheduled" },
  { label: "Draft", key: "draft" },
] as const

function legendColor(colors: ReturnType<typeof useThemeColors>, key: string): string {
  if (key === "active") return colors.primary
  if (key === "scheduled") return `${colors.primary}80`
  return `${colors.mutedForeground}66`
}

export function CampaignCalendarView({
  campaigns,
  onChanged,
}: {
  campaigns: Campaign[]
  onChanged: () => void
}) {
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useStyles()

  const [selectedIso, setSelectedIso] = useState<DayIso>(() => toDayIso(new Date()))
  const [rangeStart, setRangeStart] = useState<DayIso>(() => toDayIso(new Date()))
  const [rangeEnd, setRangeEnd] = useState<DayIso>(() => toDayIso(new Date()))

  const flights: Flight[] = useMemo(
    () =>
      campaigns
        .map((campaign): Flight | null => {
          const flight = resolveFlight(campaign)
          if (!flight) return null
          return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            market: campaign.market,
            startsOn: flight.startsOn,
            endsOn: flight.endsOn,
          }
        })
        .filter((f): f is Flight => f !== null),
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

  async function moveFlight(id: string, dayDelta: number) {
    const campaign = campaigns.find((c) => c.id === id)
    const flight = campaign && resolveFlight(campaign)
    if (!flight) return
    const start = toDayIso(addDays(parseDayIso(flight.startsOn), dayDelta))
    const end = toDayIso(addDays(parseDayIso(flight.endsOn), dayDelta))
    await rescheduleCampaign(id, start, end)
    onChanged()
  }

  async function resizeFlight(id: string, edge: "start" | "end", dayDelta: number) {
    const campaign = campaigns.find((c) => c.id === id)
    const flight = campaign && resolveFlight(campaign)
    if (!flight) return
    let start = flight.startsOn
    let end = flight.endsOn
    if (edge === "start") {
      start = toDayIso(addDays(parseDayIso(flight.startsOn), dayDelta))
      if (start > end) start = end
    } else {
      end = toDayIso(addDays(parseDayIso(flight.endsOn), dayDelta))
      if (end < start) end = start
    }
    await rescheduleCampaign(id, start, end)
    onChanged()
  }

  async function placeDraft(id: string) {
    await scheduleCampaign(id, selectedIso)
    onChanged()
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
        {LEGEND.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: legendColor(colors, item.key) }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
        <Text style={styles.legendHint}>Long-press a flight to drag · long-press a day to plan</Text>
      </View>

      <FlightCalendar
        flights={flights}
        selectedIso={selectedIso}
        onSelectDay={setSelectedIso}
        onDatesChange={(start, end) => {
          setRangeStart(start)
          setRangeEnd(end)
        }}
        onPlanRange={planRange}
        onMoveFlight={(id, delta) => void moveFlight(id, delta)}
        onResizeFlight={(id, edge, delta) => void resizeFlight(id, edge, delta)}
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
          unscheduled.map((campaign) => (
            <View key={campaign.id} style={styles.unscheduledRow}>
              <View style={styles.unscheduledHead}>
                <Text style={styles.unscheduledName} numberOfLines={1}>
                  {campaign.name}
                </Text>
                <StatusBadge status={campaign.status} />
              </View>
              <Text style={styles.unscheduledMeta} numberOfLines={1}>
                {campaign.market}
              </Text>
              <Pressable style={styles.placeButton} onPress={() => void placeDraft(campaign.id)}>
                <Text style={styles.placeButtonText}>
                  Start on {formatDayHeading(selectedIso)}
                </Text>
              </Pressable>
            </View>
          ))
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
    placeButtonText: { ...typography.label, color: c.text, fontWeight: "600" as const },
  }))
}
