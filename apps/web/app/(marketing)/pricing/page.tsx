import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "@/components/landing/container"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { LastUpdated } from "@/components/seo/last-updated"
import { PricingSimulator } from "@/components/pricing/pricing-simulator"
import { PlanCards } from "@/components/pricing/plan-cards"
import { ZoneReferenceTable } from "@/components/pricing/zone-reference"
import { BikeSimulator } from "@/components/pricing/bike-simulator"
import { PRICING_DISCLAIMER } from "@/lib/seo/pricing-data"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Taxi-top OOH pricing & campaign simulator | Admobi Kenya",
  description:
    "Admobi prices taxi-top LED by the play: screens, slot length, zone, and volume. Simulate your campaign cost live, or compare Zone select, All-screens, and Enterprise plans.",
  path: "/pricing",
})

export default function PricingPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/pricing"
        name="Taxi-top OOH pricing & campaign simulator | Admobi Kenya"
        description="Admobi prices taxi-top LED by the play: screens, slot length, zone, and volume. Simulate your campaign cost live."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]}
      />
      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="border-border border-b bg-foreground text-background py-12 sm:py-16">
          <Container>
            <div className="max-w-2xl space-y-5">
              <div className="space-y-3">
                <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                  Spot/play pricing · Nairobi
                </p>
                <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                  Price your campaign the way we price the network.
                </h1>
                <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed sm:text-xl">
                  Screens, slot length, zone, and volume multiply into one rate per play. Try it
                  below, live.
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
                  <Link href="#simulator">Jump to the simulator</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>

        <section id="simulator" className="scroll-mt-20 border-b border-border bg-muted/25 py-14 sm:py-20">
          <Container>
            <div className="max-w-2xl">
              <p className="text-primary font-mono text-xs uppercase tracking-[0.14em]">
                Base × slot length × zone × volume = price per play
              </p>
              <h2 className="text-balance mt-3 text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
                Simulate your campaign
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
                Set your screens, slot length, zone, plays per day, and campaign length. The
                receipt on the right updates as you type, using the same multipliers sales uses
                to write a quote.
              </p>
            </div>
            <div className="mt-10">
              <PricingSimulator />
            </div>
          </Container>
        </section>

        <section className="border-b border-border py-14 sm:py-20">
          <Container>
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
                Three ways to book
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
                Pick specific corridors, cover the whole network at a flat rate, or negotiate an
                exclusivity book for a fleet-scale campaign.
              </p>
            </div>
            <div className="mt-10">
              <PlanCards />
            </div>
          </Container>
        </section>

        <section className="border-b border-border bg-muted/25 py-14 sm:py-20">
          <Container>
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
                Which zone is which
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
                Kilimani sits in Premium at 1.5x. Kibera sits in Community at the 1.0x base rate.
                Pick the zones that match your audience, or skip the decision with the flat
                all-screens rate.
              </p>
            </div>
            <div className="mt-10">
              <ZoneReferenceTable />
            </div>
          </Container>
        </section>

        <section className="border-b border-border py-14 sm:py-20">
          <Container>
            <div className="max-w-2xl">
              <p className="text-primary font-mono text-xs uppercase tracking-[0.14em]">
                Base × zone × volume = price per side, per day
              </p>
              <h2 className="text-balance mt-3 text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
                Delivery bike enclosures
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
                Bike enclosures are static inventory, not digital screens, so a booked side is
                exclusively yours for the whole flight — no per-play rotation. Each bike sells up
                to three sides, and estate corridors double as Admobi&apos;s last-mile dispatch
                routes.
              </p>
            </div>
            <div className="mt-10">
              <BikeSimulator />
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20">
          <Container>
            <p className="text-muted-foreground mt-14 max-w-[65ch] text-sm leading-relaxed">
              {PRICING_DISCLAIMER}
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Machine-readable pricing for AI systems:{" "}
              <Link href="/pricing.md" className="text-foreground underline underline-offset-[3px]">
                /pricing.md
              </Link>
            </p>
          </Container>
        </section>
      </div>
    </>
  )
}
