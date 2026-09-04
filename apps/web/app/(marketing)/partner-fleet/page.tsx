import Link from "next/link"

import { Check, ClipboardList, Cpu, Smartphone, Wallet } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Container } from "@/components/landing/container"
import { ChevronPattern } from "@/components/landing/pattern-shapes"
import { FaqDetails } from "@/components/seo/faq-details"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { fleetFaqItems } from "@/lib/seo/faq-data"
import { pageMetadata } from "@/lib/seo/site"

import PartnerFleetForm from "./partner-fleet-form"

export const metadata = pageMetadata({
  title: "Partner your fleet | taxi & delivery bike OOH | Admobi Kenya",
  description:
    "Monetize taxis and delivery bikes with Admobi LED screens in Kenya. We install hardware, sell media, and share revenue with fleet partners in Nairobi and rollout cities.",
  path: "/partner-fleet",
})

const heroSteps = [
  {
    title: "Apply",
    detail:
      "Submit the form below with fleet scale, cities, and vehicle mix. Our partnership team qualifies fit before rollout.",
    icon: ClipboardList,
  },
  {
    title: "Partnership review",
    detail:
      "We respond within 48 hours with onboarding steps, install windows, and commercial terms framed for your fleet size.",
    icon: Smartphone,
  },
  {
    title: "We install fleet-wide",
    detail:
      "Certified technicians fit LED taxi-tops or delivery-bike enclosures on schedule. Typical single-vehicle work stays under ~2 hours. Hardware stays with Admobi.",
    icon: Cpu,
  },
  {
    title: "Earn per vehicle",
    detail:
      "Revenue settles monthly per contracted vehicle tied to verified screen hours when your network is on the road in agreement with your plan.",
    icon: Wallet,
  },
] as const

const termsCards = [
  {
    heading: "Commercial terms",
    body: "Rates, revenue share, and reporting cadence are confirmed in your partnership agreement or commercial letter. Nairobi-first coverage expands city by city.",
  },
  {
    heading: "Hardware ownership",
    body: "Admobi installs, owns, and maintains units for normal wear. You do not purchase hardware outright. Faulty units under ordinary use get swapped according to SLA.",
  },
  {
    heading: "Operations workload",
    body: "Admobi operates content scheduling and playback remotely. Fleet partners focus on roadworthy vehicles and access for technicians, not ads management.",
  },
  {
    heading: "Fleet readiness",
    body: "Vehicles should carry valid insurance, licensing, and an operations contact with authority to approve install slots and safety checks.",
  },
  {
    heading: "Brand and content rules",
    body: "All campaigns pass Admobi review against brand-safety posture. Sensitive categories may need extra approvals for your jurisdiction.",
  },
  {
    heading: "Exit and removal",
    body: "Wind-down timelines and hardware collection follow your agreement. Typical notice windows are spelled out upfront so fleets can rebalance routing.",
  },
  {
    heading: "GPS and verification data",
    body: "Location proof-of-play informs billing and advertiser reporting. Passenger or driver-facing personal data stays out of advertiser exports unless contractually scoped.",
  },
] as const

const eligibility = [
  "Fleet or aggregation brand with taxis, delivery bikes, or both in Kenya rollout cities today",
  "Primary contact authorised to approve installs across operating yards or partners",
  "Minimum practical batch size communicated honestly (we will advise if you are early)",
  "Roadworthy vehicles with current insurance and compliance proof on request",
  "WhatsApp or phone line for day-of coordination with field technicians",
]

export default function PartnerFleetPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/partner-fleet"
        name="Partner your fleet | taxi & delivery bike OOH | Admobi Kenya"
        description="Monetize taxis and delivery bikes with Admobi LED screens. Hardware, media sales, and revenue share for fleet partners."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Partner your fleet", path: "/partner-fleet" },
        ]}
        faqItems={fleetFaqItems}
      />

      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="relative isolate overflow-hidden border-b border-border bg-foreground py-14 text-background sm:py-20 lg:py-24">
          <ChevronPattern
            maskImage="radial-gradient(ellipse 60% 90% at 100% 0%, black, transparent 70%)"
            colorClassName="text-background/70"
          />
          <Container>
            <div className="max-w-2xl space-y-6">
              <div className="space-y-3">
                <p className="text-[0.7rem] font-medium tracking-[0.2em] text-background/65 uppercase sm:text-xs">
                  Fleet partnership · Kenya rollout
                </p>
                <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-[2.75rem]">
                  Earn revenue from fleet advertising in Kenya, partner with
                  Admobi
                </h1>
                <p className="max-w-[58ch] text-lg leading-relaxed text-background/82 sm:text-xl">
                  Register taxis or delivery bikes with Admobi. We install
                  connected screens, sell the media, and share revenue while you
                  keep routes and dispatch your own way. Fleet advertising in
                  Kenya is now a passive income stream, no ads management, no
                  hardware costs.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link href="#request-deck">Request partnership deck</Link>
              </Button>
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20">
          <Container>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Here&apos;s how it works
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {heroSteps.map((step) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="space-y-3">
                    <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-foreground">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                )
              })}
            </div>
          </Container>
        </section>

        <section className="border-t border-border py-14 sm:py-20">
          <Container>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              What you need to know
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {termsCards.map((card) => (
                <div
                  key={card.heading}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6"
                >
                  <h3 className="text-base font-semibold text-foreground">
                    {card.heading}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-t border-border py-14 sm:py-20">
          <Container>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Who fits first
            </h2>
            <ul className="mt-8 max-w-xl space-y-4">
              {eligibility.map((item) => (
                <li key={item} className="flex gap-3 text-base text-foreground">
                  <span className="mt-0.5 shrink-0 text-primary">
                    <Check className="size-5" aria-hidden />
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <FaqDetails items={fleetFaqItems} heading="Partnership FAQ" />

        <section
          id="request-deck"
          className="scroll-mt-24 border-t border-border py-14 sm:py-20"
        >
          <Container>
            <div className="max-w-xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Request partnership deck
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                Share operational basics. Expect a structured follow-up inside
                two business days.
              </p>
            </div>

            <PartnerFleetForm />

            <p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Admobi contracts with licensed fleet partners. Final economics sit
              in your signed agreement, not on this marketing page.
            </p>
          </Container>
        </section>
      </div>
    </>
  )
}
