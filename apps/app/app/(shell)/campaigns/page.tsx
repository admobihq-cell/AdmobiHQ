import { ComingSoon } from "@/components/coming-soon"
import { navItemForPath } from "@/lib/navigation"

export default function CampaignsPage() {
  const { label, description } = navItemForPath("/campaigns")

  return <ComingSoon title={label} description={description} />
}
