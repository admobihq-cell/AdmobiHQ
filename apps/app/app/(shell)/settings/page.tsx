import { ComingSoon } from "@/components/coming-soon"
import { navItemForPath } from "@/lib/navigation"

export default function SettingsPage() {
  const { label, description } = navItemForPath("/settings")

  return <ComingSoon title={label} description={description} />
}
