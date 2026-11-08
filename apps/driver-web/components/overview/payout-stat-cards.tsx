"use client"

import { CalendarCheck, Clock, Wallet } from "lucide-react"

import { StatCard } from "@/components/stat-card"
import { formatKes, formatPayoutDate, useDriverPayouts } from "@/lib/use-driver-payouts"

/** Last payout, paid this year, and pending — all from real payout rows. */
export function PayoutStatCards() {
  const { data, error } = useDriverPayouts()
  const dash = error ? "—" : "…"
  const last = data?.summary.lastPayout
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        icon={Wallet}
        label="Last payout"
        value={data ? (last ? formatKes(last.amountKes) : "None yet") : dash}
        hint={last ? formatPayoutDate(last.paidAt) : "Paid to your M-Pesa or bank"}
      />
      <StatCard
        icon={CalendarCheck}
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
    </div>
  )
}
