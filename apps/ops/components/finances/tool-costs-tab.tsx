"use client"

import Link from "next/link"
import { formatKes } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { InsightNote } from "@workspace/ui/components/dashboard/notes"
import { CATEGORY_LABEL, RATES_AS_OF, USD_KES } from "@/lib/integration-costs"

/** A run-rate summary of the integrations list. The list itself is edited under Settings. */
export function ToolCostsTab({
  data,
}: {
  data: { monthlyKes: number; activeCount: number; byCategory: { name: string; value: number }[] }
}) {
  const byCategory = data.byCategory.map((c) => ({ ...c, name: CATEGORY_LABEL[c.name] ?? c.name }))
  return (
    <div className="grid gap-4">
      <KpiStrip
        columns={3}
        items={[
          { label: "Monthly run-rate", value: formatKes(data.monthlyKes), note: "Active and trial tools" },
          { label: "Yearly run-rate", value: formatKes(data.monthlyKes * 12), note: "Twelve times the monthly figure" },
          { label: "Tools counted", value: String(data.activeCount), note: "Active and trial" },
        ]}
      />
      <ChartCard
        title="By category"
        description="Monthly run-rate in KES"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/integrations">Open integrations</Link>
          </Button>
        }
        isEmpty={byCategory.length === 0}
        emptyMessage="Add tools under Settings > Integrations to see their cost here."
        table={{ columns: ["Category", "KES a month"], rows: byCategory.map((c) => [c.name, c.value]) }}
      >
        <RankBars data={byCategory} valueFormatter={formatKes} />
      </ChartCard>
      <InsightNote>
        Free and usage-priced tools count as zero, and canceled or under-review tools are left out. Costs in
        dollars and euros are converted at KES {USD_KES} to the dollar, as of {RATES_AS_OF}.
      </InsightNote>
    </div>
  )
}
