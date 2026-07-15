import {
  Card,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

const HOME_STAT_LABELS = [
  "Total (30d)",
  "Campaign leads",
  "Fleet partners",
  "Drivers",
  "Waitlist",
  "Media kit",
] as const

/** Skeleton for home stats values only — section title and card labels stay visible. */
export function HomeStatsSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Last 30 days</h2>
          <p className="text-sm text-muted-foreground">
            Quick snapshot across all submission types.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/overview">
            Full overview
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {HOME_STAT_LABELS.map((label) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <Skeleton className="mt-2 h-8 w-12" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
