import type { Metadata } from "next"

import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "Start a campaign",
  description:
    "Brief Admobi for taxi-top OOH in Nairobi and Kenyan cities. Get availability, pricing, and a flight plan for geo-targeted LED campaigns.",
  path: "/start-campaign",
})

export default function StartCampaignLayout({ children }: { children: React.ReactNode }) {
  return children
}
