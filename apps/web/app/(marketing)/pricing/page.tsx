import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "@/components/landing/container"
import { IsoCrossPattern } from "@/components/landing/pattern-shapes"
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
        <section className="relative isolate overflow-hidden border-b border-border bg-foreground py-12 text-background sm:py-16">
          <IsoCrossPattern
            maskImage="radial-gradient(ellipse 60% 90% at 100% 0%, black, transparent 70%)"
            colorClassName="text-background/70"
          />
          <Container>
            <div className="max-w-2xl space-y-5">
              <div className="space-y-3">
                <p className="text-[0.7rem] font-medium tracking-[0.2em] text-background/65 uppercase sm:text-xs">
                  Spot/play pricing · Nairobi
                </p>
                <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-[2.75rem]">
                  Price your campaign the way we price the network.
                </h1>
                <p className="max-w-[58ch] text-lg leading-relaxed text-background/82 sm:text-xl">
                  Screens, slot length, zone, and volume multiply into one rate
                  per play. Try it below, live.
                </p>
                <LastUpdated className="text-sm text-background/70" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-background text-foreground hover:bg-background/90"
                >
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

        <section
          id="simulator"
          className="scroll-mt-20 border-b border-border bg-muted/25 py-14 sm:py-20"
        >
          <Container>
            <div className="max-w-2xl">
              <p className="font-mono text-xs tracking-[0.14em] text-primary uppercase">
                Base × slot length × zone × volume = price per play
              </p>
              <h2 className="mt-3 text-3xl leading-[1.15] font-semibold tracking-tight text-balance text-foreground sm:text-[2.25rem]">
                Simulate your campaign
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Set your screens, slot length, zone, plays per day, and campaign
                length. The receipt on the right updates as you type, using the
                same multipliers sales uses to write a quote.
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
              <h2 className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance text-foreground sm:text-[2.25rem]">
                Three ways to book
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Pick specific corridors, cover the whole network at a flat rate,
                or negotiate an exclusivity book for a fleet-scale campaign.
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
              <h2 className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance text-foreground sm:text-[2.25rem]">
                Which zone is which
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Kilimani sits in Premium at 1.5x. Kibera sits in Community at
                the 1.0x base rate. Pick the zones that match your audience, or
                skip the decision with the flat all-screens rate.
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
              <p className="font-mono text-xs tracking-[0.14em] text-primary uppercase">
                Base × zone × volume = price per side, per day
              </p>
              <h2 className="mt-3 text-3xl leading-[1.15] font-semibold tracking-tight text-balance text-foreground sm:text-[2.25rem]">
                Delivery bike enclosures
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Bike enclosures are static inventory, not digital screens, so a
                booked side is exclusively yours for the whole flight — no
                per-play rotation. Each bike sells up to three sides, and estate
                corridors double as Admobi&apos;s last-mile dispatch routes.
              </p>
            </div>
            <div className="mt-10">
              <BikeSimulator />
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20">
          <Container>
            <p className="mt-14 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              {PRICING_DISCLAIMER}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Machine-readable pricing for AI systems:{" "}
              <Link
                href="/pricing.md"
                className="text-foreground underline underline-offset-[3px]"
              >
                /pricing.md
              </Link>
            </p>
          </Container>
        </section>
      </div>
    </>
  )
}
