"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, List, MapPin, Plus } from "lucide-react"

import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { NewCampaignForm } from "@/components/campaigns/new-campaign-form"
import {
  FlightCalendar,
  type FlightPlanRange,
} from "@/components/calendar/flight-calendar"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatDayHeading,
  formatFlightDates,
  resolveFlight,
  toDayIso,
} from "@/lib/campaign-calendar"
import {
  getCampaigns,
  scheduleCampaign,
  type Campaign,
} from "@/lib/campaigns"

const LEGEND = [
  { label: "Active", className: "bg-primary" },
  { label: "Scheduled", className: "bg-primary/45" },
  { label: "Draft", className: "bg-muted-foreground/35" },
] as const

export function CampaignCalendarView() {
  const [selectedIso, setSelectedIso] = useState<string | null>(() => toDayIso(new Date()))
  const [rangeStart, setRangeStart] = useState(() => toDayIso(new Date()))
  const [rangeEnd, setRangeEnd] = useState(() => toDayIso(new Date()))
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [planRange, setPlanRange] = useState<FlightPlanRange | null>(null)

  useEffect(() => {
    setCampaigns(getCampaigns())
  }, [])

  function refresh() {
    setCampaigns(getCampaigns())
  }

  const visibleFlights = useMemo(
    () =>
      campaigns.filter((campaign) => {
        const flight = resolveFlight(campaign)
        return flight ? flight.startsOn <= rangeEnd && flight.endsOn >= rangeStart : false
      }),
    [campaigns, rangeEnd, rangeStart],
  )

  const unscheduled = useMemo(
    () => campaigns.filter((campaign) => !resolveFlight(campaign)),
    [campaigns],
  )

  const selectedFlights = useMemo(() => {
    if (!selectedIso) return []
    return campaigns.filter((campaign) => {
      const flight = resolveFlight(campaign)
      return flight ? selectedIso >= flight.startsOn && selectedIso <= flight.endsOn : false
    })
  }, [campaigns, selectedIso])

  function placeDraft(id: string) {
    if (!selectedIso) return
    scheduleCampaign(id, selectedIso)
    refresh()
  }

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Campaign calendar</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Month, week, and day views of your flights. Drag to move a window, drag across days to
            plan a new one. Planning stays on this device until booking is wired up.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <List data-icon="inline-start" />
            Campaign list
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", item.className)} />
            {item.label}
          </span>
        ))}
        <span>Click a day or drag a range to plan. Drag a flight to reschedule.</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <FlightCalendar
          campaigns={campaigns}
          onDatesChange={(start, end) => {
            setRangeStart((current) => (current === start ? current : start))
            setRangeEnd((current) => (current === end ? current : end))
          }}
          onSelectDay={setSelectedIso}
          onPlanRange={setPlanRange}
          onEventsChanged={refresh}
        />

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedIso ? formatDayHeading(selectedIso) : "Select a day"}
              </h2>
              {selectedIso ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setPlanRange({ startsOn: selectedIso, endsOn: selectedIso })
                  }
                >
                  <Plus data-icon="inline-start" />
                  Plan
                </Button>
              ) : null}
            </div>
            {selectedFlights.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                No flights on this day. Plan a new one, or place an unscheduled draft below.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selectedFlights.map((campaign) => (
                  <FlightRow key={campaign.id} campaign={campaign} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In view · {visibleFlights.length}
            </h2>
            {visibleFlights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked in this range yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleFlights.map((campaign) => (
                  <FlightRow key={campaign.id} campaign={campaign} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unscheduled · {unscheduled.length}
            </h2>
            {unscheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every campaign has a flight window.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {unscheduled.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-sm font-medium leading-snug hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      {campaign.market}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedIso}
                      onClick={() => placeDraft(campaign.id)}
                    >
                      <CalendarDays data-icon="inline-start" />
                      {selectedIso ? "Start on this day" : "Select a day first"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <Button
        type="button"
        className="fixed right-6 bottom-6 z-10 rounded-full px-5 shadow-lg md:right-8 md:bottom-8"
        onClick={() => {
          const startsOn = selectedIso ?? toDayIso(new Date())
          setPlanRange({ startsOn, endsOn: startsOn })
        }}
      >
        <Plus data-icon="inline-start" />
        Plan flight
      </Button>

      <Sheet open={planRange !== null} onOpenChange={(open) => !open && setPlanRange(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Plan a flight</SheetTitle>
            <SheetDescription>
              {planRange
                ? `Window ${formatFlightDates(planRange.startsOn, planRange.endsOn)}. Corridors and creative still confirm with your account manager before a flight goes live.`
                : "Pick a start day, then set market, format, and budget."}
            </SheetDescription>
          </SheetHeader>
          {planRange ? (
            <NewCampaignForm
              initialStartsOn={planRange.startsOn}
              initialEndsOn={planRange.endsOn}
              onCreated={() => {
                setPlanRange(null)
                refresh()
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FlightRow({ campaign }: { campaign: Campaign }) {
  return (
    <li>
      <Link
        href={`/campaigns/${campaign.id}`}
        className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/20"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{campaign.name}</p>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <p className="text-xs text-muted-foreground">{campaign.dates}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {campaign.market}
        </p>
      </Link>
    </li>
  )
}
