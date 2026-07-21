import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { SectionHeading } from "@/components/ui/section-heading"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

const HOME_STAT_LABELS = [
  "Total (30d)",
  "Campaign leads",
  "Fleet partners",
  "Drivers",
  "Waitlist",
  "Media kit",
] as const

/** Skeleton for home stats values only — section title stays visible. */
export function HomeStatsSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Last 30 days"
        description="Quick snapshot across all submission types."
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/overview">
              Full overview
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {HOME_STAT_LABELS.map((label) => (
          <Card key={label} className="shadow-none">
            <CardHeader className="pb-0">
              <Skeleton className="size-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-12" />
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
