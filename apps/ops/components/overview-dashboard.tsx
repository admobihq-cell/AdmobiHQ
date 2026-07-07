"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { formatBytes } from "@/lib/format"

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

export function OverviewDashboard({ data }: { data: OverviewData }) {
  const { overview, timeline, content } = data
  const { totals } = overview

  const kpiCards = [
    { label: "Total submissions", value: totals.all },
    { label: "Campaign leads", value: totals.leads },
    { label: "Fleet partners", value: totals.fleet },
    { label: "Drivers", value: totals.drivers },
    { label: "Waitlist", value: totals.waitlist },
    { label: "Media kit", value: totals.mediaKit },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{kpi.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submissions over time</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>By type</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Campaign budget mix</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Drivers by city</CardTitle>
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

      {content && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>CMS health</CardTitle>
              <CardDescription>Read-only snapshot · edit at admobihq.com/admin</CardDescription>
            </div>
            <Link
              href="https://admobihq.com/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open CMS Editor →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Blog posts</p>
                <p className="text-lg font-semibold">
                  {content.blog.published} published · {content.blog.draft} draft
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Help articles</p>
                <p className="text-lg font-semibold">
                  {content.help.published} published · {content.help.draft} draft
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Media library</p>
                <p className="text-lg font-semibold">
                  {content.media.total} files · {formatBytes(content.media.totalSize)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
