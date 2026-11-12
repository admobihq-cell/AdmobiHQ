import { useRouter } from "expo-router"
import { ChartCard, HeroMetric, KpiStrip, RankBars, TrendChart } from "@workspace/mobile-charts"
import { formatLabel, waiting, type NamedValue, type StatusTone, type SupportDashboardDto } from "@workspace/ops-contracts"

import { DashboardScreen, Note, QueueList } from "@/components/dashboards/dashboard-screen"

const PRIORITY: Record<string, StatusTone> = { urgent: "serious", high: "warning", normal: "neutral", low: "neutral" }

/** Severity uses status colours, always with the word beside it. */
const SEVERITY: { key: string; label: string; tone: StatusTone }[] = [
  { key: "critical", label: "Critical", tone: "serious" },
  { key: "high", label: "High", tone: "warning" },
  { key: "medium", label: "Medium", tone: "neutral" },
]

const labelled = (rows: NamedValue[]) => rows.map((r) => ({ ...r, name: formatLabel(r.name) }))

/** The Support dashboard. The driver-safety cards exist only when the API sent `safety` (needs the `safety` permission). */
export default function SupportDashboardScreen() {
  const router = useRouter()
  return (
    <DashboardScreen<SupportDashboardDto> title="Support" permission="support" name="support" load={(c, range) => c.dashboards.support(range)}>
      {(data, palette) => {
        const { safety } = data
        return (
          <>
            <HeroMetric label="Open cases" value={String(data.openCases)} palette={palette} />
            <Note palette={palette}>Open or pending, whenever they were opened</Note>
            <KpiStrip
              palette={palette}
              items={[
                { label: "Urgent open", value: String(data.urgentOpen), note: "Open or pending, marked urgent" },
                { label: "Opened in period", value: String(data.openedInRange), note: "New cases" },
                ...(safety
                  ? [
                      { label: "Open incidents", value: String(safety.openIncidents), note: "New, acknowledged or in progress" },
                      { label: "Critical incidents", value: String(safety.criticalIncidents), note: "Open and critical" },
                    ]
                  : []),
              ]}
            />
            <ChartCard
              title="Cases opened"
              description="New support cases per day"
              isEmpty={data.casesTrend.every((p) => p.opened === 0)}
              emptyMessage="No cases were opened in this period."
              palette={palette}
            >
              <TrendChart points={data.casesTrend} series={[{ key: "opened", label: "Opened" }]} palette={palette} />
            </ChartCard>
            <ChartCard title="By category" description="Cases opened in the period" isEmpty={data.byCategory.length === 0} emptyMessage="No cases were opened in this period." palette={palette}>
              <RankBars data={labelled(data.byCategory)} palette={palette} />
            </ChartCard>
            {safety ? (
              <>
                <ChartCard
                  title="Open incidents by type"
                  description="Driver safety reports that are still open"
                  isEmpty={safety.byType.length === 0}
                  emptyMessage="No incidents are open."
                  palette={palette}
                >
                  <RankBars data={labelled(safety.byType)} palette={palette} />
                </ChartCard>
                <ChartCard title="Open incidents by severity" description="Severity is set from the type when the report is made" isEmpty={false} emptyMessage="" palette={palette}>
                  <QueueList
                    palette={palette}
                    items={SEVERITY.map((s) => ({
                      key: s.key,
                      title: "Open incidents",
                      tag: { label: s.label, tone: s.tone },
                      trailing: String(safety.bySeverity.find((x) => x.name === s.key)?.value ?? 0),
                    }))}
                  />
                </ChartCard>
              </>
            ) : null}
            <ChartCard
              title="Oldest open cases"
              description={`Open or pending, longest waiting first. Showing ${data.oldestOpen.length} of ${data.openCases}`}
              isEmpty={data.oldestOpen.length === 0}
              emptyMessage="No cases are open."
              palette={palette}
            >
              <QueueList
                palette={palette}
                items={data.oldestOpen.map((r) => ({
                  key: String(r.id),
                  title: r.subject,
                  meta: `#${r.id} · ${formatLabel(r.category)} · ${r.orgName ?? "Not an advertiser"} · ${formatLabel(r.status)}`,
                  tag: { label: formatLabel(r.priority), tone: PRIORITY[r.priority] ?? "neutral" },
                  trailing: waiting(r.ageHours),
                  onPress: () => router.push(`/(ops)/support/${r.id}`),
                }))}
              />
            </ChartCard>
          </>
        )
      }}
    </DashboardScreen>
  )
}
