import { Redirect } from "expo-router"

/** Payouts are real now and live on Earnings (last payout, pending, history). */
export default function PayoutsScreen() {
  return <Redirect href="/earnings" />
}
