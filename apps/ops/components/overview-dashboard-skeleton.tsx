import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

const KPI_LABELS = [
  "Total submissions",
  "Campaign leads",
  "Fleet partners",
  "Drivers",
  "Waitlist",
  "Media kit",
]

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-9 w-16" />
      </CardHeader>
    </Card>
  )
}

function ChartCardSkeleton({ titleWidth = "w-40" }: { titleWidth?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={`h-6 ${titleWidth}`} />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-[2/1] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function OverviewDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_LABELS.map((label) => (
          <KpiCardSkeleton key={label} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton titleWidth="w-44" />
        <ChartCardSkeleton titleWidth="w-24" />
        <ChartCardSkeleton titleWidth="w-40" />
        <ChartCardSkeleton titleWidth="w-32" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Blog posts", "Help articles", "Media library"].map((label) => (
              <div key={label} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full max-w-[12rem]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
