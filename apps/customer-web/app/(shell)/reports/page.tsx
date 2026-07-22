import { ComingSoon } from "@/components/coming-soon"
import { navItemForPath } from "@/lib/navigation"

export const metadata = { title: "Reports" }

export default function ReportsPage() {
  const { label, description } = navItemForPath("/reports")

  return <ComingSoon title={label} description={description} />
}
