import type { Metadata } from "next"
import Link from "next/link"

import { Container } from "@/components/landing/container"
import { HelpIndexWithSearch } from "@/components/help/help-index-with-search"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { getHelpIndexData, isPayloadConfigured } from "@/lib/payload/help-queries"
import { pageMetadata } from "@/lib/seo/site"

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({
  title: "Help center | taxi-top OOH guides & FAQs | Admobi Kenya",
  description:
    "Guides for advertisers, drivers, and fleet partners on Admobi taxi-top LED and delivery bike OOH in Nairobi and Kenya.",
  path: "/help",
})

export default async function HelpPage() {
  const data = isPayloadConfigured()
    ? await getHelpIndexData().catch((error) => {
        console.error("[help] Failed to load articles:", error)
        return { categories: [], articles: [] }
      })
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
      <div className="border-t border-border py-10 sm:py-12">
        <Container>
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Still need help?
              </h2>
              <p className="text-muted-foreground text-sm">
                Open a support request and the Admobi team will follow up by
                email.
              </p>
            </div>
            <Link
              href="/help/contact"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
            >
              Contact support
            </Link>
          </div>
        </Container>
      </div>
    </>
  )
}
