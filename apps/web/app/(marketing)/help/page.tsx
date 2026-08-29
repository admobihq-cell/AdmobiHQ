import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"

import { Container } from "@/components/landing/container"
import { HelpArticleSearch } from "@/components/help/help-article-search"
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
      <section className="pt-12 pb-2 sm:pt-16">
        <Container>
          <p className="text-primary font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
            Help
          </p>
          <h1 className="text-foreground mt-3 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[2.75rem]">
            Find an answer
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[58ch] text-lg leading-relaxed">
            Campaign setup, driver payouts, fleet install, and Nairobi coverage. Search first, then
            pick a role.
          </p>
        </Container>
      </section>

      <HelpArticleSearch categories={data.categories} articles={data.articles} />
    </>
  )
}
