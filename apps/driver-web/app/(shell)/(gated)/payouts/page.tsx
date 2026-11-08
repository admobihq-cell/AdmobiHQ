import { redirect } from "next/navigation"

/** Payouts are real now and live on Earnings (last payout, pending, history). */
export default function PayoutsPage() {
  redirect("/earnings")
}
