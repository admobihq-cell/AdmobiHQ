"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, {
  type EventResizeDoneArg,
} from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import timeGridPlugin from "@fullcalendar/timegrid"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { CalendarGridSkeleton } from "@/components/calendar/campaign-calendar-skeleton"
import {
  exclusiveEndIso,
  inclusiveEndIso,
  resolveFlight,
  toDayIso,
} from "@/lib/campaign-calendar"
import type { CampaignDto } from "@workspace/ops-contracts"

import "./flight-calendar.css"

export const CALENDAR_VIEWS = [
  { id: "dayGridMonth", label: "Month" },
  { id: "timeGridWeek", label: "Week" },
  { id: "timeGridDay", label: "Day" },
  { id: "listWeek", label: "Agenda" },
] as const

export type CalendarViewId = (typeof CALENDAR_VIEWS)[number]["id"]

export const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

export type FlightPlanRange = {
  startsOn: string
  endsOn: string
}

export function FlightCalendar({
  campaigns,
  onDatesChange,
  onSelectDay,
  onPlanRange,
  onReschedule,
}: {
  campaigns: CampaignDto[]
  onDatesChange: (rangeStart: string, rangeEnd: string) => void
  onSelectDay: (iso: string) => void
  onPlanRange: (range: FlightPlanRange) => void
  /** Persist a drag/resize. Returning false reverts the move on screen —
   * used when the API rejects it. */
  onReschedule: (id: number, startsOn: string, endsOn: string) => Promise<boolean>
}) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [title, setTitle] = useState("")
  const [view, setView] = useState<CalendarViewId>("dayGridMonth")
  // FullCalendar renders collapsed for a frame on mount; hold a skeleton over it
  // until its first layout pass (datesSet), with a timeout as a safety net.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1500)
    return () => clearTimeout(id)
  }, [])

  const events = useMemo(
    () => campaigns.map(campaignToEvent).filter((event): event is EventInput => event !== null),
    [campaigns],
  )

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (api && api.view.type !== view) api.changeView(view)
  }, [view])

  function handleDatesSet(info: DatesSetArg) {
    const nextView = info.view.type as CalendarViewId
    if (nextView !== view) setView(nextView)
    setTitle(info.view.title)
    setReady(true)
    onDatesChange(toDayIso(info.start), inclusiveEndIso(toDayIso(info.end)))
  }

  function handleDateClick(info: { dateStr: string }) {
    onSelectDay(info.dateStr.slice(0, 10))
  }

  function handleSelect(info: DateSelectArg) {
    const startsOn = info.startStr.slice(0, 10)
    const endsOn = inclusiveEndIso(info.endStr.slice(0, 10))
    onSelectDay(startsOn)
    onPlanRange({ startsOn, endsOn: endsOn < startsOn ? startsOn : endsOn })
    calendarRef.current?.getApi().unselect()
  }

  function handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault()
    router.push(`/campaigns/${info.event.id}`)
  }

  function persistEventRange(
    id: string,
    start: Date | null,
    end: Date | null,
    revert: () => void,
  ) {
    if (!start) {
      revert()
      return
    }
    const startsOn = toDayIso(start)
    const endsOn = end ? inclusiveEndIso(toDayIso(end)) : startsOn
    void onReschedule(Number(id), startsOn, endsOn < startsOn ? startsOn : endsOn).then((ok) => {
      // The optimistic move stays on screen while the PATCH is in flight;
      // revert only once the server actually refuses it.
      if (!ok) revert()
    })
  }

  function go(action: "prev" | "next" | "today") {
    const api = calendarRef.current?.getApi()
    if (!api) return
    if (action === "today") api.today()
    else if (action === "prev") api.prev()
    else api.next()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => go("prev")}
            aria-label="Previous"
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-[10.5rem] text-center text-sm font-semibold tabular-nums">
            {title || "Calendar"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => go("next")}
            aria-label="Next"
          >
            <ChevronRight />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => go("today")}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {CALENDAR_VIEWS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={view === item.id ? "default" : "outline"}
              className={cn(view !== item.id && "text-muted-foreground")}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "flight-calendar relative overflow-hidden rounded-xl bg-card p-2 ring-1 ring-foreground/10 md:p-3",
          !ready && "min-h-[34rem]",
        )}
      >
        <div className={cn(!ready && "invisible")}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            height="auto"
            firstDay={1}
            navLinks
            nowIndicator
            selectable
            selectMirror
            editable
            eventStartEditable
            eventDurationEditable
            dayMaxEventRows={4}
            allDayText="Flights"
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            events={events}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={(info: EventDropArg) =>
              persistEventRange(info.event.id, info.event.start, info.event.end, info.revert)
            }
            eventResize={(info: EventResizeDoneArg) =>
              persistEventRange(info.event.id, info.event.start, info.event.end, info.revert)
            }
          />
        </div>
        {!ready ? (
          <div className="pointer-events-none absolute inset-2 md:inset-3">
            <CalendarGridSkeleton className="h-full" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Colour by what the advertiser cares about: an approved campaign shows its
 * flight phase, everything else shows where it sits in review. */
function eventVariant(campaign: CampaignDto): string {
  if (campaign.status === "approved") return campaign.flight_phase
  if (campaign.status === "rejected" || campaign.status === "changes_requested") {
    return "needs-changes"
  }
  return campaign.status
}

/** Only an editable campaign may be dragged. A campaign under review must not
 * silently change its dates while ops is looking at it, and an approved one is
 * a commitment. FullCalendar simply won't start the drag, so there is no
 * refusal to explain — the badge and review banner already say why. */
function isDraggable(campaign: CampaignDto): boolean {
  return EDITABLE_STATUSES.has(campaign.status)
}

function campaignToEvent(campaign: CampaignDto): EventInput | null {
  const flight = resolveFlight(campaign)
  if (!flight) return null
  return {
    id: String(campaign.id),
    title: campaign.name,
    start: flight.startsOn,
    end: exclusiveEndIso(flight.endsOn),
    allDay: true,
    editable: isDraggable(campaign),
    startEditable: isDraggable(campaign),
    durationEditable: isDraggable(campaign),
    classNames: ["flight-event", `flight-event--${eventVariant(campaign)}`],
    extendedProps: {
      market: campaign.market,
      status: campaign.status,
    },
  }
}
