import { Suspense } from "react"
import { notFound } from "next/navigation"

import { CampaignReportView } from "@/components/reports/campaign-report-view"

import ReportsLoading from "../../loading"

export const metadata = { title: "Campaign report" }

export default async function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const campaignId = Number((await params).id)
  if (!Number.isInteger(campaignId) || campaignId <= 0) notFound()
  return (
    // The view reads ?range= with useSearchParams, which needs a boundary here.
    <Suspense fallback={<ReportsLoading />}>
      <CampaignReportView id={campaignId} />
    </Suspense>
  )
}
