import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "expo-router"
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { ChevronLeft, ChevronRight } from "@/components/icons"
import {
  formatDayHeading,
  formatFlightDates,
  parseDayIso,
  toDayIso,
  type DayIso,
} from "@/lib/campaign-calendar"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"
import {
  buildMonthMatrix,
  buildWeek,
  CALENDAR_VIEWS,
  dayTitle,
  flightsOnDay,
  inMonth,
  isToday,
  layoutWeek,
  maxLane,
  monthTitle,
  weekTitle,
  WEEKDAY_LABELS,
  type CalendarViewId,
  type Flight,
} from "@/components/calendar/calendar-model"

export type FlightPlanRange = { startsOn: DayIso; endsOn: DayIso }

const MONTH_ROW_HEIGHT = 108
const MONTH_HEADER_HEIGHT = 22
const LANE_HEIGHT = 18
const LANE_GAP = 3
const MONTH_MAX_LANES = 3

function statusColor(colors: ReturnType<typeof useThemeColors>, status: string): string {
  if (status === "active") return colors.primary
  if (status === "scheduled") return `${colors.primary}80`
  if (status === "completed") return colors.mutedForeground
  return `${colors.mutedForeground}66`
}

export function FlightCalendar({
  flights,
  onDatesChange,
  onSelectDay,
  selectedIso,
  onPlanRange,
  onMoveFlight,
  onResizeFlight,
}: {
  flights: Flight[]
  onDatesChange: (rangeStart: DayIso, rangeEnd: DayIso) => void
  onSelectDay: (iso: DayIso) => void
  selectedIso: DayIso | null
  onPlanRange: (range: FlightPlanRange) => void
  onMoveFlight: (id: string, dayDelta: number) => void
  onResizeFlight: (id: string, edge: "start" | "end", dayDelta: number) => void
}) {
  const colors = useThemeColors()
  const [view, setView] = useState<CalendarViewId>("month")
  const [anchor, setAnchor] = useState(() => new Date())

  const styles = useStyles()

  const weeks = useMemo(() => buildMonthMatrix(anchor), [anchor])
  const weekDays = useMemo(() => buildWeek(anchor), [anchor])

  // Report the visible range up to the wrapper whenever view/anchor changes.
  const rangeKey = `${view}:${anchor.toDateString()}`
  const onDatesChangeRef = useRef(onDatesChange)
  onDatesChangeRef.current = onDatesChange
  useEffect(() => {
    if (view === "month") {
      onDatesChangeRef.current(weeks[0]![0]!, weeks[5]![6]!)
    } else if (view === "week") {
      onDatesChangeRef.current(weekDays[0]!, weekDays[6]!)
    } else {
      const iso = toDayIso(anchor)
      onDatesChangeRef.current(iso, iso)
    }
  }, [rangeKey, view, anchor, weeks, weekDays])

  function shift(direction: -1 | 1) {
    setAnchor((current) => {
      const next = new Date(current)
      if (view === "month") next.setMonth(next.getMonth() + direction)
      else if (view === "week") next.setDate(next.getDate() + 7 * direction)
      else next.setDate(next.getDate() + direction)
      return next
    })
  }

  const title =
    view === "month"
      ? monthTitle(anchor)
      : view === "week"
        ? weekTitle(weekDays)
        : view === "day"
          ? dayTitle(anchor)
          : "Agenda"

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <View style={styles.nav}>
          <Pressable
            onPress={() => shift(-1)}
            style={styles.navButton}
            accessibilityRole="button"
            accessibilityLabel="Previous"
            hitSlop={8}
          >
            <ChevronLeft color={colors.text} size={18} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            onPress={() => shift(1)}
            style={styles.navButton}
            accessibilityRole="button"
            accessibilityLabel="Next"
            hitSlop={8}
          >
            <ChevronRight color={colors.text} size={18} />
          </Pressable>
          <Pressable
            onPress={() => setAnchor(new Date())}
            style={styles.todayButton}
            accessibilityRole="button"
          >
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.viewSwitch}
      >
        {CALENDAR_VIEWS.map((item) => {
          const active = item.id === view
          return (
            <Pressable
              key={item.id}
              onPress={() => setView(item.id)}
              style={[styles.viewChip, active && styles.viewChipActive]}
            >
              <Text style={[styles.viewChipText, active && styles.viewChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {view === "month" ? (
        <MonthGrid
          weeks={weeks}
          anchor={anchor}
          flights={flights}
          selectedIso={selectedIso}
          onSelectDay={onSelectDay}
          onPlanRange={onPlanRange}
          onMoveFlight={onMoveFlight}
          onResizeFlight={onResizeFlight}
        />
      ) : view === "week" ? (
        <WeekGrid
          days={weekDays}
          flights={flights}
          selectedIso={selectedIso}
          onSelectDay={onSelectDay}
          onPlanRange={onPlanRange}
          onMoveFlight={onMoveFlight}
          onResizeFlight={onResizeFlight}
        />
      ) : view === "day" ? (
        <DayView iso={toDayIso(anchor)} flights={flights} onPlanRange={onPlanRange} />
      ) : (
        <AgendaView flights={flights} />
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Month grid                                                          */
/* ------------------------------------------------------------------ */

function MonthGrid({
  weeks,
  anchor,
  flights,
  selectedIso,
  onSelectDay,
  onPlanRange,
  onMoveFlight,
  onResizeFlight,
}: {
  weeks: DayIso[][]
  anchor: Date
  flights: Flight[]
  selectedIso: DayIso | null
  onSelectDay: (iso: DayIso) => void
  onPlanRange: (r: FlightPlanRange) => void
  onMoveFlight: (id: string, dayDelta: number) => void
  onResizeFlight: (id: string, edge: "start" | "end", dayDelta: number) => void
}) {
  const styles = useStyles()
  const [gridWidth, setGridWidth] = useState(0)
  const colWidth = gridWidth > 0 ? gridWidth / 7 : 0

  return (
    <View
      style={styles.grid}
      onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {colWidth > 0
        ? weeks.map((week, weekIdx) => (
            <WeekRow
              key={week[0]}
              week={week}
              anchor={anchor}
              flights={flights}
              colWidth={colWidth}
              rowHeight={MONTH_ROW_HEIGHT}
              maxLanes={MONTH_MAX_LANES}
              dimOutside
              selectedIso={selectedIso}
              onSelectDay={onSelectDay}
              onPlanRange={onPlanRange}
              onMoveFlight={onMoveFlight}
              onResizeFlight={onResizeFlight}
              isFirstRow={weekIdx === 0}
            />
          ))
        : null}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Week grid (single week, tall)                                       */
/* ------------------------------------------------------------------ */

function WeekGrid({
  days,
  flights,
  selectedIso,
  onSelectDay,
  onPlanRange,
  onMoveFlight,
  onResizeFlight,
}: {
  days: DayIso[]
  flights: Flight[]
  selectedIso: DayIso | null
  onSelectDay: (iso: DayIso) => void
  onPlanRange: (r: FlightPlanRange) => void
  onMoveFlight: (id: string, dayDelta: number) => void
  onResizeFlight: (id: string, edge: "start" | "end", dayDelta: number) => void
}) {
  const styles = useStyles()
  const [gridWidth, setGridWidth] = useState(0)
  const colWidth = gridWidth > 0 ? gridWidth / 7 : 0
  const lanes = maxLane(layoutWeek(days, flights)) + 1
  const rowHeight = Math.max(320, MONTH_HEADER_HEIGHT + (lanes + 2) * (LANE_HEIGHT + LANE_GAP) + 16)

  return (
    <View
      style={styles.grid}
      onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.weekdayRow}>
        {days.map((iso) => (
          <Text key={iso} style={styles.weekdayLabel}>
            {WEEKDAY_LABELS[(parseDayIso(iso).getDay() + 6) % 7]}
          </Text>
        ))}
      </View>
      {colWidth > 0 ? (
        <WeekRow
          week={days}
          anchor={parseDayIso(days[0]!)}
          flights={flights}
          colWidth={colWidth}
          rowHeight={rowHeight}
          maxLanes={99}
          dimOutside={false}
          selectedIso={selectedIso}
          onSelectDay={onSelectDay}
          onPlanRange={onPlanRange}
          onMoveFlight={onMoveFlight}
          onResizeFlight={onResizeFlight}
          isFirstRow
        />
      ) : null}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Shared week row with day cells + draggable flight bars              */
/* ------------------------------------------------------------------ */

function WeekRow({
  week,
  anchor,
  flights,
  colWidth,
  rowHeight,
  maxLanes,
  dimOutside,
  selectedIso,
  onSelectDay,
  onPlanRange,
  onMoveFlight,
  onResizeFlight,
  isFirstRow,
}: {
  week: DayIso[]
  anchor: Date
  flights: Flight[]
  colWidth: number
  rowHeight: number
  maxLanes: number
  dimOutside: boolean
  selectedIso: DayIso | null
  onSelectDay: (iso: DayIso) => void
  onPlanRange: (r: FlightPlanRange) => void
  onMoveFlight: (id: string, dayDelta: number) => void
  onResizeFlight: (id: string, edge: "start" | "end", dayDelta: number) => void
  isFirstRow: boolean
}) {
  const colors = useThemeColors()
  const styles = useStyles()
  const segments = useMemo(() => layoutWeek(week, flights), [week, flights])
  const visibleSegments = segments.filter((s) => s.lane < maxLanes)
  const hiddenByDay = new Map<DayIso, number>()
  for (const seg of segments) {
    if (seg.lane < maxLanes) continue
    for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c += 1) {
      const iso = week[c]!
      hiddenByDay.set(iso, (hiddenByDay.get(iso) ?? 0) + 1)
    }
  }

  // Range-select overlay driven on the UI thread.
  const selStart = useSharedValue(-1)
  const selEnd = useSharedValue(-1)

  const commitRange = (a: number, b: number) => {
    const lo = Math.max(0, Math.min(a, b))
    const hi = Math.min(6, Math.max(a, b))
    onPlanRange({ startsOn: week[lo]!, endsOn: week[hi]! })
  }

  const rangeGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart((e) => {
      const col = Math.floor(e.x / colWidth)
      selStart.value = col
      selEnd.value = col
    })
    .onUpdate((e) => {
      selEnd.value = Math.max(0, Math.min(6, Math.floor(e.x / colWidth)))
    })
    .onEnd(() => {
      if (selStart.value >= 0) runOnJS(commitRange)(selStart.value, selEnd.value)
      selStart.value = -1
      selEnd.value = -1
    })

  const rangeStyle = useAnimatedStyle(() => {
    if (selStart.value < 0) return { opacity: 0, left: 0, width: 0 }
    const lo = Math.min(selStart.value, selEnd.value)
    const hi = Math.max(selStart.value, selEnd.value)
    return {
      opacity: 1,
      left: lo * colWidth,
      width: (hi - lo + 1) * colWidth,
    }
  })

  const laneTop = (lane: number) => MONTH_HEADER_HEIGHT + lane * (LANE_HEIGHT + LANE_GAP)

  return (
    <View style={[styles.weekRow, { height: rowHeight }]}>
      {/* Day-cell backgrounds + tap targets */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.cellRow}>
          {week.map((iso) => {
            const outside = dimOutside && !inMonth(iso, anchor)
            const today = isToday(iso)
            const selected = iso === selectedIso
            return (
              <Pressable
                key={iso}
                onPress={() => onSelectDay(iso)}
                style={[
                  styles.cell,
                  { width: colWidth },
                  selected && styles.cellSelected,
                ]}
              >
                <View
                  style={[
                    styles.dayNumberWrap,
                    today && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      outside && styles.dayNumberOutside,
                      today && { color: colors.primaryForeground },
                    ]}
                  >
                    {parseDayIso(iso).getDate()}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Long-press-drag to plan a new flight range */}
      <GestureDetector gesture={rangeGesture}>
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.rangeOverlay,
              { top: MONTH_HEADER_HEIGHT, height: rowHeight - MONTH_HEADER_HEIGHT },
              rangeStyle,
            ]}
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>

      {/* Flight bars */}
      {visibleSegments.map((seg) => (
        <FlightBar
          key={`${seg.flight.id}-${seg.lane}`}
          segment={seg}
          colWidth={colWidth}
          top={laneTop(seg.lane)}
          onMoveFlight={onMoveFlight}
          onResizeFlight={onResizeFlight}
        />
      ))}

      {/* "+N more" markers */}
      {maxLanes < 90
        ? week.map((iso, c) => {
            const hidden = hiddenByDay.get(iso) ?? 0
            if (hidden <= 0) return null
            return (
              <Pressable
                key={`more-${iso}`}
                onPress={() => onSelectDay(iso)}
                style={[
                  styles.moreMarker,
                  {
                    left: c * colWidth + 2,
                    width: colWidth - 4,
                    top: laneTop(maxLanes),
                  },
                ]}
              >
                <Text style={styles.moreText}>+{hidden}</Text>
              </Pressable>
            )
          })
        : null}

      {isFirstRow ? null : <View style={styles.rowDivider} />}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Draggable / resizable flight bar                                    */
/* ------------------------------------------------------------------ */

function FlightBar({
  segment,
  colWidth,
  top,
  onMoveFlight,
  onResizeFlight,
}: {
  segment: import("@/components/calendar/calendar-model").FlightSegment
  colWidth: number
  top: number
  onMoveFlight: (id: string, dayDelta: number) => void
  onResizeFlight: (id: string, edge: "start" | "end", dayDelta: number) => void
}) {
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useStyles()
  const { flight, colStart, colSpan, continuesLeft, continuesRight } = segment

  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const active = useSharedValue(0)
  const leftPad = useSharedValue(0)
  const rightPad = useSharedValue(0)

  const openFlight = () => router.push(`/campaigns/${flight.id}`)
  const move = (delta: number) => {
    if (delta !== 0) onMoveFlight(flight.id, delta)
  }
  const resize = (edge: "start" | "end", delta: number) => {
    if (delta !== 0) onResizeFlight(flight.id, edge, delta)
  }

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => runOnJS(openFlight)())

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.value = withTiming(1, { duration: 120 })
    })
    .onUpdate((e) => {
      dragX.value = e.translationX
      dragY.value = e.translationY
    })
    .onEnd(() => {
      const dayDelta =
        Math.round(dragX.value / colWidth) + Math.round(dragY.value / MONTH_ROW_HEIGHT) * 7
      runOnJS(move)(dayDelta)
      dragX.value = withTiming(0, { duration: 140 })
      dragY.value = withTiming(0, { duration: 140 })
      active.value = withTiming(0, { duration: 140 })
    })

  const leftHandle = Gesture.Pan()
    .onUpdate((e) => {
      leftPad.value = e.translationX
    })
    .onEnd(() => {
      runOnJS(resize)("start", Math.round(leftPad.value / colWidth))
      leftPad.value = withTiming(0, { duration: 140 })
    })

  const rightHandle = Gesture.Pan()
    .onUpdate((e) => {
      rightPad.value = e.translationX
    })
    .onEnd(() => {
      runOnJS(resize)("end", Math.round(rightPad.value / colWidth))
      rightPad.value = withTiming(0, { duration: 140 })
    })

  const composed = Gesture.Race(tap, pan)

  const barStyle = useAnimatedStyle(() => ({
    left: colStart * colWidth + 2 + leftPad.value,
    width: Math.max(colWidth * 0.4, colSpan * colWidth - 4 - leftPad.value + rightPad.value),
    top,
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 1 + active.value * 0.03 },
    ],
    zIndex: active.value > 0 ? 20 : 5,
    opacity: 1 - active.value * 0.1,
  }))

  const bg = statusColor(colors, flight.status)

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.bar,
          barStyle,
          {
            backgroundColor: bg,
            borderTopLeftRadius: continuesLeft ? 0 : 6,
            borderBottomLeftRadius: continuesLeft ? 0 : 6,
            borderTopRightRadius: continuesRight ? 0 : 6,
            borderBottomRightRadius: continuesRight ? 0 : 6,
          },
        ]}
        accessibilityLabel={`${flight.name}, ${formatFlightDates(flight.startsOn, flight.endsOn)}`}
      >
        {!continuesLeft ? (
          <GestureDetector gesture={leftHandle}>
            <View style={styles.handle} hitSlop={6} />
          </GestureDetector>
        ) : null}
        <Text style={styles.barText} numberOfLines={1}>
          {flight.name}
        </Text>
        {!continuesRight ? (
          <GestureDetector gesture={rightHandle}>
            <View style={styles.handle} hitSlop={6} />
          </GestureDetector>
        ) : null}
      </Animated.View>
    </GestureDetector>
  )
}

/* ------------------------------------------------------------------ */
/* Day + Agenda views                                                  */
/* ------------------------------------------------------------------ */

function DayView({
  iso,
  flights,
  onPlanRange,
}: {
  iso: DayIso
  flights: Flight[]
  onPlanRange: (r: FlightPlanRange) => void
}) {
  const styles = useStyles()
  const dayFlights = flightsOnDay(iso, flights)
  return (
    <View style={styles.dayView}>
      <Text style={styles.dayHeading}>{formatDayHeading(iso)}</Text>
      {dayFlights.length === 0 ? (
        <Pressable
          style={styles.dayEmpty}
          onPress={() => onPlanRange({ startsOn: iso, endsOn: iso })}
        >
          <Text style={styles.dayEmptyText}>No flights this day. Tap to plan one.</Text>
        </Pressable>
      ) : (
        dayFlights.map((flight) => <FlightListRow key={flight.id} flight={flight} />)
      )}
    </View>
  )
}

function AgendaView({ flights }: { flights: Flight[] }) {
  const styles = useStyles()
  const todayIso = toDayIso(new Date())
  const upcoming = [...flights]
    .filter((f) => f.endsOn >= todayIso)
    .sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1))
  const past = [...flights]
    .filter((f) => f.endsOn < todayIso)
    .sort((a, b) => (a.startsOn > b.startsOn ? -1 : 1))

  return (
    <View style={styles.dayView}>
      <Text style={styles.agendaGroup}>Upcoming · {upcoming.length}</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.dayEmptyText}>Nothing booked ahead.</Text>
      ) : (
        upcoming.map((flight) => <FlightListRow key={flight.id} flight={flight} />)
      )}
      {past.length > 0 ? (
        <>
          <Text style={styles.agendaGroup}>Past · {past.length}</Text>
          {past.map((flight) => (
            <FlightListRow key={flight.id} flight={flight} muted />
          ))}
        </>
      ) : null}
    </View>
  )
}

export function FlightListRow({ flight, muted }: { flight: Flight; muted?: boolean }) {
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useStyles()
  return (
    <Pressable
      style={[styles.listRow, muted && { opacity: 0.65 }]}
      onPress={() => router.push(`/campaigns/${flight.id}`)}
    >
      <View
        style={[styles.listDot, { backgroundColor: statusColor(colors, flight.status) }]}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.listName} numberOfLines={1}>
          {flight.name}
        </Text>
        <Text style={styles.listMeta} numberOfLines={1}>
          {formatFlightDates(flight.startsOn, flight.endsOn)} · {flight.market}
        </Text>
      </View>
    </Pressable>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

function useStyles() {
  return useThemedStyles((c) => ({
    wrap: { gap: spacing.sm },
    toolbar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    nav: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      flex: 1,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.surface,
    },
    title: {
      ...typography.section,
      color: c.text,
      flex: 1,
      textAlign: "center" as const,
    },
    todayButton: {
      paddingHorizontal: 12,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.surface,
    },
    todayText: { ...typography.label, color: c.text, fontWeight: "600" as const },
    viewSwitch: { gap: spacing.xs, paddingVertical: 2 },
    viewChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    viewChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    viewChipText: {
      ...typography.label,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    viewChipTextActive: { color: c.primaryForeground },
    grid: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      overflow: "hidden" as const,
      backgroundColor: c.surface,
    },
    weekdayRow: {
      flexDirection: "row" as const,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.muted,
    },
    weekdayLabel: {
      ...typography.caption,
      flex: 1,
      textAlign: "center" as const,
      paddingVertical: 6,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    weekRow: {
      position: "relative" as const,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    cellRow: { flexDirection: "row" as const, flex: 1 },
    cell: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.border,
      paddingTop: 3,
      alignItems: "center" as const,
    },
    cellSelected: { backgroundColor: `${c.primary}12` },
    dayNumberWrap: {
      minWidth: 20,
      height: 18,
      borderRadius: 9,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 4,
    },
    dayNumber: { ...typography.caption, color: c.text, fontWeight: "600" as const },
    dayNumberOutside: { color: c.mutedForeground, opacity: 0.5 },
    rangeOverlay: {
      position: "absolute" as const,
      backgroundColor: `${c.primary}22`,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 6,
    },
    bar: {
      position: "absolute" as const,
      height: LANE_HEIGHT,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 6,
      overflow: "hidden" as const,
    },
    barText: {
      ...typography.caption,
      fontSize: 11,
      color: c.primaryForeground,
      fontWeight: "600" as const,
      flex: 1,
    },
    handle: { width: 6, height: "100%" as const },
    moreMarker: { position: "absolute" as const, height: LANE_HEIGHT, justifyContent: "center" as const },
    moreText: { ...typography.caption, fontSize: 10, color: c.mutedForeground, fontWeight: "700" as const },
    rowDivider: { position: "absolute" as const },
    dayView: { gap: spacing.sm, paddingTop: spacing.xs },
    dayHeading: { ...typography.section, color: c.text },
    dayEmpty: {
      padding: spacing.lg,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
    dayEmptyText: { ...typography.bodySm, color: c.mutedForeground },
    agendaGroup: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
      marginTop: spacing.xs,
    },
    listRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    listDot: { width: 8, height: 8, borderRadius: 4 },
    listName: { ...typography.label, color: c.text, fontWeight: "600" as const },
    listMeta: { ...typography.caption, color: c.mutedForeground, marginTop: 2 },
  }))
}
