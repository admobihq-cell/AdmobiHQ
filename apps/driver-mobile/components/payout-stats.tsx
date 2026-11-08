import { Clock, TrendingUp, Wallet } from "@/components/icons"
import { StatCard } from "@/components/ui/stat-card"
import { formatKes, formatPayoutDate, useDriverPayouts } from "@/lib/driver-payouts"

/** Last payout, paid this year, and pending — all from real payout rows. */
export function PayoutStats() {
  const { data, isError } = useDriverPayouts()
  const dash = isError ? "—" : "…"
  const last = data?.summary.lastPayout
  return (
    <>
      <StatCard
        icon={Wallet}
        label="Last payout"
        value={data ? (last ? formatKes(last.amountKes) : "None yet") : dash}
        hint={last ? formatPayoutDate(last.paidAt) : "To your M-Pesa or bank"}
      />
      <StatCard
        icon={TrendingUp}
        label="Paid this year"
        value={data ? formatKes(data.summary.paidThisYearKes) : dash}
        hint="Settled payouts"
      />
      <StatCard
        icon={Clock}
        label="Pending"
        value={data ? formatKes(data.summary.pendingKes) : dash}
        hint="Saved or being sent"
      />
    </>
  )
}
