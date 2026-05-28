import type { Metadata } from "next"

import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "Fleet partnerships",
  description:
    "Monetise taxis and delivery fleets in Kenya with Admobi taxi-top LED screens. We install hardware, sell media, and share revenue with fleet partners.",
  path: "/partner-fleet",
})

export default function PartnerFleetLayout({ children }: { children: React.ReactNode }) {
  return children
}
