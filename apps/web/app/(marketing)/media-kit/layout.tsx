import type { Metadata } from "next"

import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "Media kit",
  description:
    "Taxi-top LED specs, reach narratives, codec guidance, and creative dimensions for Kenyan OOH campaigns. Request the Admobi media kit by email.",
  path: "/media-kit",
})

export default function MediaKitLayout({ children }: { children: React.ReactNode }) {
  return children
}
