import { Greeting } from "@/components/overview/greeting"
import { PayoutHero } from "@/components/overview/payout-hero"
import { RecentUpdates } from "@/components/overview/recent-updates"

/** Home: the payout first, then what's new. Route and screen-hour figures are
 * deliberately absent until telemetry records them (see Routes for samples). */
export function DashboardView({ payoutDestination }: { payoutDestination: string | null }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        <Greeting />
      </h1>
      <PayoutHero destination={payoutDestination} showHistoryLink />
      <RecentUpdates />
    </div>
  )
}
