import type { Metadata } from "next"

import { HelpIndexWithSearch } from "@/components/help/help-index-with-search"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { getHelpIndexData, isPayloadConfigured } from "@/lib/payload/help-queries"
import { pageMetadata } from "@/lib/seo/site"

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({
  title: "Help center — taxi-top OOH guides & FAQs | Admobi Kenya",
  description:
    "Guides for advertisers, drivers, and fleet partners on Admobi taxi-top LED and delivery bike OOH in Nairobi and Kenya.",
  path: "/help",
})

export default async function HelpPage() {
  const data = isPayloadConfigured()
    ? await getHelpIndexData().catch(() => ({ categories: [], articles: [] }))
    : { categories: [], articles: [] }

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
      <HelpIndexWithSearch categories={data.categories} articles={data.articles} />
    </>
  )
}
