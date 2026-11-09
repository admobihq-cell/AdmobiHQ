import { useAuth } from "@clerk/clerk-expo"
import { useQuery } from "@tanstack/react-query"

import { fetchDriverPayouts } from "@/lib/driver-profile"

export { PAYOUT_STATUS_LABEL } from "@workspace/ops-contracts"

/** Real payout rows for the earnings and home screens. */
export function useDriverPayouts() {
  const { getToken, isLoaded } = useAuth()
  return useQuery({
    queryKey: ["driver-payouts"],
    queryFn: () => fetchDriverPayouts(getToken),
    enabled: isLoaded,
  })
}

export const formatKes = (amount: number) =>
  `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`

export const formatPayoutDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-11" → "Nov 2026". */
export const monthName = (m: string) => `${MONTHS[Number(m.slice(5)) - 1] ?? m} ${m.slice(0, 4)}`
