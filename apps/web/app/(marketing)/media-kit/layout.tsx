import type { Metadata } from "next"

import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "OOH media kit — taxi-top specs & creative dimensions | Admobi Kenya",
  description:
    "Taxi-top LED specs, reach narratives, codec guidance, and creative dimensions for Kenyan OOH campaigns. Request the Admobi media kit by email.",
  path: "/media-kit",
})

export default function MediaKitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingPageJsonLd
        path="/media-kit"
        name="OOH media kit — taxi-top specs & creative dimensions | Admobi Kenya"
        description="Taxi-top LED specs, codec guidance, and creative dimensions for Kenyan OOH campaigns."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Media kit", path: "/media-kit" },
        ]}
      />
      {children}
    </>
  )
}
