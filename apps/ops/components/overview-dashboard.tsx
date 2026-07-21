"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Car,
  FileText,
  Layers,
  Mail,
  Megaphone,
  Truck,
} from "lucide-react"

import { StatCard } from "@/components/ui/stat-card"
import { SectionHeading } from "@/components/ui/section-heading"
import { CmsHealthCard } from "@/components/cms-health-card"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

type OverviewData = {
  overview: {
    totals: {
      all: number
      leads: number
      fleet: number
      drivers: number
      waitlist: number
      mediaKit: number
    }
    byType: Array<{ name: string; value: number }>
    budgetMix: Array<{ name: string; value: number }>
    driversByCity: Array<{ name: string; value: number }>
    fleetByCity: Array<{ name: string; value: number }>
    driversByHeard: Array<{ name: string; value: number }>
  }
  timeline: Array<{ day: string; count: number }>
  content: {
    blog: { total: number; published: number; draft: number }
    help: { total: number; published: number; draft: number }
    media: { total: number; totalSize: number }
  } | null
}

const lineConfig = {
  count: { label: "Submissions", color: "var(--chart-1)" },
} satisfies ChartConfig

const barConfig = {
  value: { label: "Count", color: "var(--chart-2)" },
} satisfies ChartConfig

const KPI_CONFIG = [
  { key: "all", label: "Total submissions", icon: Layers },
  { key: "leads", label: "Campaign leads", icon: Megaphone },
  { key: "fleet", label: "Fleet partners", icon: Truck },
  { key: "drivers", label: "Drivers", icon: Car },
  { key: "waitlist", label: "Waitlist", icon: Mail },
  { key: "mediaKit", label: "Media kit", icon: FileText },
] as const

export function OverviewDashboard({ data }: { data: OverviewData }) {
  const { overview, timeline, content } = data
  const { totals } = overview

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_CONFIG.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={totals[kpi.key]}
          />
        ))}
      </div>

      <div className="space-y-4">
        <SectionHeading title="Trends & breakdown" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Submissions over time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={lineConfig} className="aspect-[2/1] w-full">
                <LineChart data={timeline} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-KE", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">By type</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barConfig} className="aspect-[2/1] w-full">
                <BarChart data={overview.byType} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {overview.budgetMix.length > 0 && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Campaign budget mix</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barConfig} className="aspect-[2/1] w-full">
                  <BarChart data={overview.budgetMix}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {overview.driversByCity.length > 0 && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Drivers by city</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barConfig} className="aspect-[2/1] w-full">
                  <BarChart data={overview.driversByCity}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--chart-3)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {content ? <CmsHealthCard content={content} /> : null}
    </div>
  )
}
