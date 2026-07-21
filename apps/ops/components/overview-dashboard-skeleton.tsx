import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { SectionHeading } from "@/components/ui/section-heading"

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

/** Skeleton for overview chart/KPI data only — titles stay visible. */
export function OverviewDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_ITEMS.map((label) => (
          <Card key={label} className="shadow-none">
            <CardHeader className="pb-0">
              <Skeleton className="size-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <SectionHeading title="Trends & breakdown" />
        <div className="grid gap-4 lg:grid-cols-2">
          {CHART_ITEMS.map((title) => (
            <Card key={title} className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-[2/1] w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading title="CMS health" />
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {["Blog posts", "Help articles", "Media library"].map((label) => (
                <div key={label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <Skeleton className="h-6 w-full max-w-[12rem]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
