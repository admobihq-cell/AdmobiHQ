"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, FileDown, List, MapPin, Plus, Wallet } from "lucide-react"
import { formatKes, type CampaignDto } from "@workspace/ops-contracts"

import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import {
  EDITABLE_STATUSES,
  FlightCalendar,
} from "@/components/calendar/flight-calendar"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { formatDayHeading, resolveFlight, toDayIso } from "@/lib/campaign-calendar"
import { useCampaigns, useDownloadPdf, useUpdateCampaign } from "@/lib/use-campaigns"

/** Matches the flight-event--* classes in flight-calendar.css. */
const LEGEND = [
  { label: "Live", className: "bg-primary" },
  { label: "Scheduled", className: "bg-primary/45" },
  { label: "In queue", className: "bg-amber-400" },
  { label: "Needs changes", className: "bg-destructive" },
  { label: "Draft", className: "bg-muted-foreground/35" },
] as const

export function CampaignCalendarView() {
  const router = useRouter()
  const [selectedIso, setSelectedIso] = useState<string | null>(() => toDayIso(new Date()))
  const [rangeStart, setRangeStart] = useState(() => toDayIso(new Date()))
  const [rangeEnd, setRangeEnd] = useState(() => toDayIso(new Date()))

  const campaignsQuery = useCampaigns()
  const update = useUpdateCampaign()
  const downloadPdf = useDownloadPdf()
  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])

  /** Money already committed: approved campaigns whose flight hasn't finished.
   * Mirrors isActive() in apps/api/lib/campaign-statement.ts so the figure on
   * screen and the figure in the downloaded statement are the same number. */
  const active = useMemo(
    () =>
      campaigns.filter(
        (campaign) => campaign.flight_phase === "live" || campaign.flight_phase === "scheduled",
      ),
    [campaigns],
  )
  const activeBudget = useMemo(
    () => active.reduce((sum, campaign) => sum + Number(campaign.budget_kes ?? 0), 0),
    [active],
  )

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

  /** Returns false so the calendar reverts the drag when the API refuses it —
   * e.g. the campaign entered review between render and drop. */
  async function reschedule(id: number, startsOn: string, endsOn: string): Promise<boolean> {
    try {
      await update.mutateAsync({ id, data: { starts_on: startsOn, ends_on: endsOn } })
      return true
    } catch {
      return false
    }
  }

  function planFrom(startsOn: string, endsOn: string) {
    router.push(`/campaigns/new?start=${startsOn}&end=${endsOn}`)
  }

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Campaign calendar</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Month, week, and day views of your flights. Drag a draft to move it, or drag across
            days to plan a new one. Campaigns in review or already approved are locked.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/campaigns">
              <List data-icon="inline-start" />
              Campaign list
            </Link>
          </Button>
          <Button
            variant="outline"
            loading={downloadPdf.isPending}
            loadingText="Preparing…"
            onClick={() =>
              downloadPdf.mutate({
                path: "/v1/customer/campaigns/statement",
                filename: "admobi-campaign-statement.pdf",
              })
            }
          >
            <FileDown data-icon="inline-start" />
            Download statement
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <div className="flex items-center gap-3">
          <Wallet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Active campaign budget
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {campaignsQuery.isPending ? "—" : formatKes(activeBudget)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {active.length} approved flight{active.length === 1 ? "" : "s"} live or scheduled ·
          the statement PDF lists every campaign with its budget
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", item.className)} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        {campaignsQuery.isPending ? (
          <Skeleton className="h-[32rem] w-full rounded-xl" />
        ) : (
          <FlightCalendar
            campaigns={campaigns}
            onDatesChange={(start, end) => {
              setRangeStart((current) => (current === start ? current : start))
              setRangeEnd((current) => (current === end ? current : end))
            }}
            onSelectDay={setSelectedIso}
            onPlanRange={(range) => planFrom(range.startsOn, range.endsOn)}
            onReschedule={reschedule}
          />
        )}

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedIso ? formatDayHeading(selectedIso) : "Select a day"}
              </h2>
              {selectedIso ? (
                <Button type="button" size="sm" onClick={() => planFrom(selectedIso, selectedIso)}>
                  <Plus data-icon="inline-start" />
                  Plan
                </Button>
              ) : null}
            </div>
            {selectedFlights.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                No flights on this day. Plan a new one, or schedule an unscheduled campaign below.
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
                      <CampaignStatusBadge
                        status={campaign.status}
                        flightPhase={campaign.flight_phase}
                      />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      {campaign.market ?? "Market not set"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedIso || !EDITABLE_STATUSES.has(campaign.status)}
                      loading={update.isPending}
                      onClick={() => {
                        if (!selectedIso) return
                        void reschedule(campaign.id, selectedIso, selectedIso)
                      }}
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
          planFrom(startsOn, startsOn)
        }}
      >
        <Plus data-icon="inline-start" />
        Plan flight
      </Button>
    </div>
  )
}

function FlightRow({ campaign }: { campaign: CampaignDto }) {
  return (
    <li>
      <Link
        href={`/campaigns/${campaign.id}`}
        className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/20"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{campaign.name}</p>
          <CampaignStatusBadge status={campaign.status} flightPhase={campaign.flight_phase} />
        </div>
        <p className="text-xs text-muted-foreground">
          {campaign.starts_on && campaign.ends_on
            ? `${campaign.starts_on} → ${campaign.ends_on}`
            : "Not scheduled"}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {campaign.market ?? "Market not set"}
        </p>
      </Link>
    </li>
  )
}
