"use client"

import { formatCompact, formatKes, type ReportOverviewDto } from "@workspace/ops-contracts"

import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { Card, CardContent } from "@workspace/ui/components/card"
import { CampaignHealthLedger } from "@/components/reports/campaign-health-ledger"
import { DeliveryPacingCard } from "@/components/reports/delivery-pacing-card"
import { percentOrDash, rangeText } from "@/components/reports/format"
import { WhatsWorkingCard } from "@/components/reports/whats-working-card"

const NO_ESTIMATE_NOTE = "No audience estimate yet. Plays are counted, but people are not."

/** Reports > Overview: the headline, the delivery summary, pacing, what's working, campaign health. */
export function ReportsOverviewTab({ report, canSeeMoney }: { report: ReportOverviewDto; canSeeMoney: boolean }) {
  const { impressions } = report
  const range = impressions ? rangeText(impressions.low, impressions.high) : null

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs xl:col-span-1">
          <CardContent>
            <HeroMetric
              label="Est. impressions"
              value={impressions ? impressions.current.toLocaleString("en-KE") : "—"}
              deltas={
                impressions
                  ? [
                      {
                        label: "vs previous period",
                        delta: impressions,
                        good: "up",
                      },
                    ]
                  : []
              }
              note={impressions ? (range ? `Range ${range}` : "Estimate") : NO_ESTIMATE_NOTE}
              series={report.impressionsTrend.map((p) => ({
                day: p.day,
                value: typeof p.impressions === "number" ? p.impressions : null,
              }))}
            />
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <KpiStrip
            columns={4}
            className="h-full"
            items={[
              {
                label: "Plays delivered",
                value: report.playsDelivered.current.toLocaleString("en-KE"),
                note: "In the selected period",
                delta: { delta: report.playsDelivered, good: "up" },
              },
              {
                label: "Delivery rate",
                value: report.deliveryRate ? percentOrDash(report.deliveryRate.current) : "—",
                note: "Delivered ÷ scheduled",
                delta: report.deliveryRate ? { delta: report.deliveryRate, good: "up" } : undefined,
              },
              {
                label: "Reach",
                value: report.reachLikely === null ? "—" : formatCompact(report.reachLikely),
                note: report.reachLikely === null ? "Shown for one campaign" : "People reached, once each",
              },
              ...(canSeeMoney
                ? [
                    {
                      label: "Cost per 1,000",
                      value: report.costPerThousandKes ? formatKes(report.costPerThousandKes.current) : "—",
                      note: report.costPerThousandKes ? "Per 1,000 est. impressions" : "Needs an estimate and no market or time filter",
                      delta: report.costPerThousandKes
                        ? { delta: report.costPerThousandKes, good: "down" as const }
                        : undefined,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DeliveryPacingCard pacing={report.pacing} hasRows={report.hasDeliveryRows} />
        <WhatsWorkingCard
          working={report.whatsWorking}
          hasRows={report.hasDeliveryRows}
          hasImpressions={impressions !== null}
        />
      </div>

      <CampaignHealthLedger ledger={report.ledger} showMoney={canSeeMoney} />
    </div>
  )
}
