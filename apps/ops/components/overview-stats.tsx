import type { DateRangeKey } from "@/lib/queries/stats"
import { getContentStats } from "@/lib/queries/content"
import { getOverviewStats, getSubmissionsOverTime } from "@/lib/queries/stats"
import { OverviewDashboard } from "@/components/overview-dashboard"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type OverviewStatsProps = {
  range: DateRangeKey
}

export async function OverviewStats({ range }: OverviewStatsProps) {
  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 365 : 30

  try {
    const [overview, timeline, content] = await Promise.all([
      getOverviewStats(range),
      getSubmissionsOverTime(days),
      getContentStats(),
    ])

    return <OverviewDashboard data={{ overview, timeline, content }} />
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"

    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Could not load dashboard</CardTitle>
          <CardDescription>{message}</CardDescription>
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
    )
  }
}
