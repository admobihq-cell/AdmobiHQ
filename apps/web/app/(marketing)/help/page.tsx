import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"

import { HelpHub } from "@/components/help/help-hub"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { getCachedHelpIndexData, isPayloadConfigured } from "@/lib/payload/help-queries"
import { pageMetadata } from "@/lib/seo/site"

export const revalidate = 86400

export const metadata: Metadata = pageMetadata({
  title: "Help center | taxi-top OOH guides & FAQs | Admobi Kenya",
  description:
    "Guides for advertisers, drivers, and fleet partners on Admobi taxi-top LED and delivery bike OOH in Nairobi and Kenya.",
  path: "/help",
})

export default async function HelpPage() {
  const data = isPayloadConfigured()
    ? await getCachedHelpIndexData().catch((error) => {
        console.error("[help] Failed to load articles:", error)
        noStore()
        return { categories: [], articles: [] }
      })
    : { categories: [], articles: [] }

  if (data.articles.length === 0) {
    noStore()
  }

  return (
    <>
      <MarketingPageJsonLd
        path="/help"
        name="Help center"
        description="Guides for advertisers, drivers, and fleet partners on Admobi taxi-top OOH in Kenya."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
        ]}
      />
      <HelpHub categories={data.categories} articles={data.articles} />
    </>
  )
}
