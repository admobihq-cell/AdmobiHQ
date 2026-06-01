import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "@/components/landing/container"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { LastUpdated } from "@/components/seo/last-updated"
import { PricingTiersTable } from "@/components/seo/pricing-tiers-table"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Indicative OOH pricing — taxi tops & delivery bikes | Admobi Kenya",
  description:
    "Starting-from KES tiers for geo-targeted taxi-top LED and delivery bike advertising in Nairobi. Confirmed per brief. Machine-readable pricing for AI agents.",
  path: "/pricing",
})

export default function PricingPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/pricing"
        name="Indicative OOH pricing — taxi tops & delivery bikes | Admobi Kenya"
        description="Starting-from KES tiers for geo-targeted taxi-top LED and delivery bike advertising in Nairobi. Confirmed per brief."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]}
      />
      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="border-border border-b bg-foreground text-background py-14 sm:py-20 lg:py-24">
          <Container>
            <div className="max-w-2xl space-y-6">
              <div className="space-y-3">
                <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                  Indicative pricing · Nairobi
                </p>
                <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                  How much does taxi-top advertising cost in Nairobi?
                </h1>
                <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed sm:text-xl">
                  Admobi publishes starting-from KES tiers for taxi-top LED and delivery bike flights so planners can budget before a brief. Final rates depend on corridors, duration, inventory, and creative scope — confirmed when you start a campaign.
                </p>
                <LastUpdated className="text-background/70 text-sm" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                  <Link href="/start-campaign">Get a confirmed quote</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-background/35 bg-transparent text-background hover:bg-background/10 hover:text-background"
                >
                  <Link href="/products-solutions">Products & solutions</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20">
          <Container>
            <PricingTiersTable />
          </Container>
        </section>
      </div>
    </>
  )
}
