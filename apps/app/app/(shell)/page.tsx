import { ComingSoon } from "@/components/coming-soon"
import { navItemForPath } from "@/lib/navigation"

export const metadata = { title: "Overview" }

export default function OverviewPage() {
  const { label, description } = navItemForPath("/")

  return <ComingSoon title={label} description={description} />
}
