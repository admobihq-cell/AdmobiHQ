import { Suspense } from "react"

import { HomeStatsSection } from "@/components/home-stats-section"
import { HomeStatsSkeleton } from "@/components/home-stats-skeleton"
import { HomeWelcome } from "@/components/home-welcome"
import { HomeModules } from "@/components/home-modules"

export const metadata = { title: "Home" }

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <Suspense
        fallback={
          <div className="min-h-[13rem] animate-pulse rounded-xl border bg-muted md:min-h-[15rem]" />
        }
      >
        <HomeWelcome />
      </Suspense>

      <Suspense fallback={<HomeStatsSkeleton />}>
        <HomeStatsSection />
      </Suspense>

      <HomeModules />
    </div>
  )
}
