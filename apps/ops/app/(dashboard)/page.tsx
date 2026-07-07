"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { OverviewDashboard } from "@/components/overview-dashboard"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export default function OverviewPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d")
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Overview</h1>
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
              npm run db:push -w web
            </code>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          {(["7d", "30d", "90d", "all"] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "ghost"}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r === "all" ? "All time" : r.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
      <OverviewDashboard data={data} />
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/leads", label: "Campaign Leads" },
          { href: "/fleet", label: "Fleet Partners" },
          { href: "/drivers", label: "Drivers" },
          { href: "/waitlist", label: "Waitlist" },
          { href: "/media-kit", label: "Media Kit" },
        ].map((link) => (
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
