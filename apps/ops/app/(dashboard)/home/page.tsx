import { Suspense } from "react"

import { HomeStatsSection } from "@/components/home-stats-section"
import { HomeStatsSkeleton } from "@/components/home-stats-skeleton"
import { HomeWelcome } from "@/components/home-welcome"
import { HomeModules } from "@/components/home-modules"
import { Skeleton } from "@workspace/ui/components/skeleton"

export const metadata = { title: "Home" }

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <Suspense
        fallback={
          <section className="relative overflow-hidden rounded-xl border bg-card p-6 md:p-8">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome back
            </h1>
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </section>
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
