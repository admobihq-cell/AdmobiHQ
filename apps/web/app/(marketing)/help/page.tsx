import type { Metadata } from "next"
import Link from "next/link"

import { Container } from "@/components/landing/container"
import { HelpArticleSearch } from "@/components/help/help-article-search"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { getCachedHelpIndexData, isPayloadConfigured } from "@/lib/payload/help-queries"
import { MARKETING_REVALIDATE_SECONDS } from "@/lib/seo/isr"
import { pageMetadata } from "@/lib/seo/site"

export const revalidate = MARKETING_REVALIDATE_SECONDS

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
      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="border-border border-b bg-foreground py-14 text-background sm:py-20">
          <Container>
            <div className="max-w-2xl space-y-4">
              <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                Help center
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                Guides and answers for Admobi in Kenya
              </h1>
              <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed">
                Campaign setup, driver onboarding, fleet partnerships, and Nairobi rollout, all in
                one place.
              </p>
            </div>
          </Container>
        </section>

        <HelpArticleSearch categories={data.categories} articles={data.articles} />
      </div>

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
