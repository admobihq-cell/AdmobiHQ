import type { Metadata } from "next"

import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "Start an OOH campaign in Nairobi | Admobi",
  description:
    "Brief Admobi for taxi-top OOH in Nairobi and Kenyan cities. Get availability, pricing, and a flight plan for geo-targeted LED campaigns.",
  path: "/start-campaign",
})

export default function StartCampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingPageJsonLd
        path="/start-campaign"
        name="Start an OOH campaign in Nairobi | Admobi"
        description="Brief Admobi for taxi-top OOH in Nairobi and Kenyan cities. Get availability, pricing, and a flight plan."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Start a campaign", path: "/start-campaign" },
        ]}
      />
      {children}
    </>
  )
}
