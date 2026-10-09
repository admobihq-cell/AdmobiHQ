"use client"

import { useMemo } from "react"
import { ChevronLeft } from "lucide-react"

import { zoneForMarket } from "@workspace/ops-contracts/pricing"
import { cn } from "@workspace/ui/lib/utils"

import { AdScreen } from "./ad-screen"
import { useSimNow } from "./clock"
import {
  ADS,
  ZONE_IDS,
  nextAiring,
  poseAt,
  screensShowing,
  tallyToday,
  targetZones,
  zoneAt,
  zoneName,
  type AdId,
} from "./fleet"
import { CopyLinkButton, formatCountdown } from "./vehicle-details"

const compact = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 })

/** Today's tallies, recomputed once a minute (it walks every slot since 06:00). */
function useTallyToday() {
  const minute = useSimNow(60)
  return useMemo(() => tallyToday(minute), [minute])
}

export function CampaignList({ onPick }: { onPick: (id: AdId) => void }) {
  const t = useSimNow(1)
  const tally = useTallyToday()
  const ads = Object.values(ADS).sort((a, b) => tally[b.id].plays - tally[a.id].plays)

  return (
    <ul className="py-1.5">
      {ads.map((ad) => {
        const live = screensShowing(ad.id, t).length
        return (
          <li key={ad.id}>
            <button
              type="button"
              onClick={() => onPick(ad.id)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: ad.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{ad.brand}</span>
                <span className="block truncate text-xs text-muted-foreground">{ad.campaign}</span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={cn(
                    "block text-xs font-medium tabular-nums",
                    live === 0 && "text-muted-foreground",
                  )}
                >
                  {live > 0 ? `${live} on screen` : "Between spots"}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {tally[ad.id].plays.toLocaleString("en-KE")} plays
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function CampaignDetails({
  adId,
  onBack,
  onPickVehicle,
}: {
  adId: AdId
  onBack: () => void
  onPickVehicle: (id: string) => void
}) {
  const t = useSimNow(1)
  const tally = useTallyToday()[adId]
  const ad = ADS[adId]
  const live = screensShowing(adId, t)
  const next = live.length === 0 ? nextAiring(adId, t) : null
  const zones = new Set(targetZones(adId))

  return (
    <>
      <div className="space-y-3 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            All campaigns
          </button>
          <CopyLinkButton query={`campaign=${adId}`} />
        </div>

        <AdScreen ad={ad} shape="taxi" startedAt={0} />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ad.campaign}</p>
          <p className="truncate text-xs text-muted-foreground">{ad.advertiser}</p>
        </div>

        <dl className="grid grid-cols-3 divide-x rounded-lg border">
          <Stat label="On screen" value={String(live.length)} />
          <Stat label="Plays today" value={tally.plays.toLocaleString("en-KE")} />
          <Stat label="Est. views" value={compact.format(tally.views)} />
        </dl>
        <p className="text-[11px] text-muted-foreground">
          Plays count since 06:00. Views are illustrative: plays × typical traffic in each zone.
        </p>
      </div>

      <section className="space-y-2.5 px-4 py-3.5">
        <h2 className="text-xs font-semibold">Booked markets</h2>
        <ul className="flex flex-wrap gap-1.5">
          {ZONE_IDS.filter((z) => zones.has(z)).map((z) => (
            <li
              key={z}
              className="rounded-md border px-2 py-0.5 text-xs font-medium"
              style={{ borderColor: `${ad.color}66`, backgroundColor: `${ad.color}14` }}
            >
              {zoneName(z)}
              {z !== "network" ? (
                <span className="ml-1 font-normal text-muted-foreground capitalize">
                  · {zoneForMarket(z).id}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-1 py-2">
        <h2 className="px-4 pt-1.5 pb-1 text-xs font-semibold">On screen now</h2>
        {live.length > 0 ? (
          <ul>
            {live.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onPickVehicle(v.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{v.plate}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.kind === "taxi" ? "Taxi-top" : "Delivery bike"} · {zoneAt(poseAt(v, t).position).name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">Open</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-1.5 text-xs text-muted-foreground">
            {next
              ? `Between spots. Next on ${next.vehicle.plate} in ${formatCountdown(next.at - t)}.`
              : "Not scheduled in the next two minutes."}
          </p>
        )}
      </section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-1.5 px-2 py-2 text-center">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-base leading-none font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
