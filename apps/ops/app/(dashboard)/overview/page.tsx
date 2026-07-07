"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { OverviewDashboard } from "@/components/overview-dashboard"
import { OverviewDashboardSkeleton } from "@/components/overview-dashboard-skeleton"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const RANGE_OPTIONS = ["7d", "30d", "90d", "all"] as const
type RangeOption = (typeof RANGE_OPTIONS)[number]

const QUICK_LINKS = [
  { href: "/leads", label: "Campaign Leads" },
  { href: "/fleet", label: "Fleet Partners" },
  { href: "/drivers", label: "Drivers" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/media-kit", label: "Media Kit" },
] as const

export default function OverviewPage() {
  const [range, setRange] = useState<RangeOption>("30d")
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchStats>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    void fetchStats(range)
      .then(setData)
      .catch((e: unknown) => {
        setData(null)
        setError(e instanceof Error ? e.message : "Failed to load stats")
      })
      .finally(() => setLoading(false))
  }, [range])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Operational pulse across leads, fleet, drivers, and signups.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {RANGE_OPTIONS.map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "ghost"}
              size="sm"
              disabled={loading}
              onClick={() => setRange(r)}
            >
              {r === "all" ? "All time" : r.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <OverviewDashboardSkeleton />
      ) : error || !data ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription>{error ?? "Unknown error"}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Check that secrets are loaded:</p>
            <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs">
              npm run env:pull -w ops
            </code>
            <p className="mt-3">
              If the database schema is outdated, apply Prisma changes (dev DB only):
            </p>
            <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs">
              npm run db:ops-schema -w web
            </code>
          </CardContent>
        </Card>
      ) : (
        <OverviewDashboard data={data} />
      )}

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <Button key={link.href} variant="outline" size="sm" asChild>
            <Link href={link.href}>{link.label} →</Link>
          </Button>
        ))}
      </div>
    </div>
  )
}

async function fetchStats(range: string) {
  const res = await fetch(`/api/stats?range=${range}`)
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to load stats")
  }
  return body as {
    overview: Awaited<
      ReturnType<typeof import("@/lib/queries/stats").getOverviewStats>
    >
    timeline: Awaited<
      ReturnType<typeof import("@/lib/queries/stats").getSubmissionsOverTime>
    >
    content: Awaited<
      ReturnType<typeof import("@/lib/queries/content").getContentStats>
    >
  }
}
