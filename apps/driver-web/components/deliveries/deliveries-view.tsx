"use client"

import { ArrowRight, MapPin } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"

import { SampleLabel } from "@/components/sample-tag"

type Job = { id: string; pickup: string; dropoff: string; km: number; feeKes: number; window: string }

/** Illustrative jobs: dispatch isn't built yet, so nothing here can be accepted. */
const SAMPLE_JOBS: Job[] = [
  { id: "1", pickup: "Sarit Centre, Westlands", dropoff: "Wood Ave, Kilimani", km: 5.2, feeKes: 350, window: "Today, 2–4 pm" },
  { id: "2", pickup: "Kimathi St, CBD", dropoff: "Lavington Mall", km: 7.8, feeKes: 420, window: "Today, 3–5 pm" },
  { id: "3", pickup: "Yaya Centre, Kilimani", dropoff: "Upper Hill Rd", km: 3.4, feeKes: 280, window: "Today, 5–7 pm" },
  { id: "4", pickup: "Two Rivers Mall", dropoff: "Westlands Rd", km: 9.6, feeKes: 510, window: "Tomorrow, 9–11 am" },
]

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`

const columns: LedgerColumn<Job>[] = [
  {
    key: "route",
    header: "Pickup → drop-off",
    render: (j) => (
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{j.pickup}</span>
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{j.dropoff}</span>
        </p>
      </div>
    ),
  },
  { key: "window", header: "When", className: "hidden sm:table-cell", render: (j) => j.window },
  { key: "km", header: "Distance", align: "right", className: "hidden md:table-cell", render: (j) => `${j.km} km` },
  { key: "fee", header: "Fee", align: "right", render: (j) => <span className="font-medium">{kes(j.feeKes)}</span> },
  {
    key: "accept",
    header: <span className="sr-only">Action</span>,
    align: "right",
    render: () => (
      <Button size="sm" variant="outline" disabled>
        Accept
      </Button>
    ),
  },
]

export function DeliveriesView() {
  const avgFee = Math.round(SAMPLE_JOBS.reduce((s, j) => s + j.feeKes, 0) / SAMPLE_JOBS.length)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Deliveries</h1>
            <StatusPill tone="warning">Preview, not live yet</StatusPill>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            How delivery jobs will look once Admobi Deliveries ships: pick up near you, carry it alongside your screen,
            and get paid on top of your ad earnings. Dispatch isn&apos;t built yet, so jobs can&apos;t be accepted.
          </p>
        </div>
      </div>

      <KpiStrip
        columns={4}
        items={[
          { label: <SampleLabel>Jobs near you</SampleLabel>, value: String(SAMPLE_JOBS.length), note: "Open in the next 24 hours" },
          { label: <SampleLabel>Average fee</SampleLabel>, value: kes(avgFee), note: "Per job in this example" },
          { label: "Completed", value: "0", note: "Jobs you've delivered" },
          { label: "Earned from deliveries", value: kes(0), note: "On top of screen earnings" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <LedgerCard
            title={<SampleLabel>Available near you</SampleLabel>}
            description="Example jobs, nearest pickup first"
            columns={columns}
            rows={SAMPLE_JOBS}
            rowKey={(j) => j.id}
            empty="No jobs near you right now."
          />
        </div>
        <DashboardCard title="Job history" description="Pickups and drop-offs you've completed">
          <p className="text-sm font-medium">No completed deliveries yet</p>
          <p className="text-sm text-muted-foreground">
            Once dispatch is live, every job you finish shows here with its fee and the payout it was added to.
          </p>
        </DashboardCard>
      </div>
    </div>
  )
}
