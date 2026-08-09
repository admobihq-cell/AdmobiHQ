import { ComingSoon } from "@/components/coming-soon"
import { navItemForPath } from "@/lib/navigation"

export const metadata = { title: "Payouts" }

export default function PayoutsPage() {
  const { label, description } = navItemForPath("/payouts")

  return <ComingSoon title={label} description={description} />
}
