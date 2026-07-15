import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

const KPI_ITEMS = [
  "Total submissions",
  "Campaign leads",
  "Fleet partners",
  "Drivers",
  "Waitlist",
  "Media kit",
] as const

const CHART_ITEMS = [
  "Submissions over time",
  "By type",
  "Campaign budget mix",
  "Drivers by city",
] as const

/** Skeleton for overview chart/KPI data only — titles and labels stay visible. */
export function OverviewDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_ITEMS.map((label) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <Skeleton className="mt-2 h-9 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CHART_ITEMS.map((title) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-[2/1] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">CMS health</CardTitle>
            <CardDescription>Payload content snapshot</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Blog posts", "Help articles", "Media library"].map((label) => (
              <div key={label} className="space-y-2">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Skeleton className="h-6 w-full max-w-[12rem]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
