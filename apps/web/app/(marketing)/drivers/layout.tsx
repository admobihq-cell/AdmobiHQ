import type { Metadata } from "next"

import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "Driver program",
  description:
    "Join Admobi as a taxi or delivery driver in Kenya. Monthly payouts, hardware installed by Admobi, and no extra work beyond your usual routes.",
  path: "/drivers",
})

export default function DriversLayout({ children }: { children: React.ReactNode }) {
  return children
}
