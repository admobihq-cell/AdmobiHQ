"use client"

import Link from "next/link"
import { formatLabel } from "@workspace/ops-contracts"

import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip, type KpiItem } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill, type StatusTone } from "@workspace/ui/components/dashboard/status-pill"
import { waiting } from "@/components/dashboards/format"
import type { OldestCaseRow, SupportDashboardDto } from "@/lib/queries/support-analytics"

const PRIORITY: Record<string, StatusTone> = { urgent: "serious", high: "warning", normal: "neutral", low: "neutral" }

/** Severity uses status colours, always with the word beside it. */
const SEVERITY: { key: string; label: string; tone: StatusTone }[] = [
  { key: "critical", label: "Critical", tone: "serious" },
  { key: "high", label: "High", tone: "warning" },
  { key: "medium", label: "Medium", tone: "neutral" },
]

const COLUMNS: LedgerColumn<OldestCaseRow>[] = [
  {
    key: "subject",
    header: "Case",
    className: "min-w-48 whitespace-normal",
    render: (r) => (
      <div>
        <Link href={`/support/${r.id}`} className="font-medium hover:underline">
          {r.subject}
        </Link>
        <p className="text-xs text-muted-foreground">
          #{r.id} · {formatLabel(r.category)}
        </p>
      </div>
    ),
  },
  { key: "org", header: "Account", render: (r) => r.orgName ?? "Not an advertiser" },
  { key: "priority", header: "Priority", render: (r) => <StatusPill tone={PRIORITY[r.priority] ?? "neutral"}>{formatLabel(r.priority)}</StatusPill> },
  { key: "status", header: "Status", render: (r) => formatLabel(r.status) },
  { key: "age", header: "Open for", align: "right", render: (r) => waiting(r.ageHours) },
]

export function SupportDashboard({ data }: { data: SupportDashboardDto }) {
  const { safety } = data
  const items: KpiItem[] = [
    { label: "Urgent open", value: String(data.urgentOpen), note: "Open or pending, marked urgent" },
    { label: "Opened in period", value: String(data.openedInRange), note: "New cases" },
    ...(safety
      ? [
          { label: "Open incidents", value: String(safety.openIncidents), note: "New, acknowledged or in progress" },
          { label: "Critical incidents", value: String(safety.criticalIncidents), note: "Open and critical" },
        ]
      : []),
  ]

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent>
            <HeroMetric label="Open cases" value={String(data.openCases)} note="Open or pending, whenever they were opened" />
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <KpiStrip items={items} columns={Math.min(4, Math.max(2, items.length)) as 2 | 3 | 4} className="h-full" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Cases opened"
          description="New support cases per day"
          isEmpty={data.casesTrend.every((p) => p.opened === 0)}
          emptyMessage="No cases were opened in this period."
          table={{ columns: ["Day", "Opened"], rows: data.casesTrend.map((p) => [p.day, Number(p.opened)]) }}
        >
          <TrendChart data={data.casesTrend} series={[{ key: "opened", label: "Opened" }]} />
        </ChartCard>
        <ChartCard
          title="By category"
          description="Cases opened in the period"
          isEmpty={data.byCategory.length === 0}
          emptyMessage="No cases were opened in this period."
          table={{ columns: ["Category", "Cases"], rows: data.byCategory.map((c) => [formatLabel(c.name), c.value]) }}
        >
          <RankBars data={data.byCategory.map((c) => ({ ...c, name: formatLabel(c.name) }))} />
        </ChartCard>
      </div>

      {safety ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Open incidents by type"
            description="Driver safety reports that are still open"
            isEmpty={safety.byType.length === 0}
            emptyMessage="No incidents are open."
            table={{ columns: ["Type", "Incidents"], rows: safety.byType.map((t) => [formatLabel(t.name), t.value]) }}
          >
            <RankBars data={safety.byType.map((t) => ({ ...t, name: formatLabel(t.name) }))} />
          </ChartCard>
          <DashboardCard title="Open incidents by severity" description="Severity is set from the type when the report is made">
            <ul className="grid gap-2">
              {SEVERITY.map((s) => (
                <li key={s.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <StatusPill tone={s.tone}>{s.label}</StatusPill>
                  <span className="text-lg font-semibold tabular-nums">
                    {safety.bySeverity.find((x) => x.name === s.key)?.value ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>
      ) : null}

      <LedgerCard
        title="Oldest open cases"
        description="Open or pending, longest waiting first"
        columns={COLUMNS}
        rows={data.oldestOpen}
        rowKey={(r) => String(r.id)}
        footer={{ viewing: `Viewing ${data.oldestOpen.length} out of ${data.openCases}`, page: 1, pageCount: 1, onPageChange: () => {} }}
        empty="No cases are open."
      />
    </div>
  )
}
