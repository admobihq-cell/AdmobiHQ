import { Container } from "./container"
import { AudiencesSection } from "./audiences"
import { FaqSection } from "./faq"
import { GetStartedSection } from "./get-started-section"
import { HeroSection } from "./hero"
import { MarketsSection } from "./markets"
import { MissionSection } from "./mission-section"
import { MobileStickyCta } from "./mobile-sticky-cta"
import { ProcessSection } from "./process"
import { ProductSection } from "./product-section"
import { TrustedLogosSection } from "./trusted-logos"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"
import { WhyTaxisSection } from "./why-taxis"

export function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <WhyTaxisSection />
        <MissionSection />
        <ProductSection />
        <TrustedLogosSection />
        <AudiencesSection />
        <MarketsSection />
        <ProcessSection />
        <section className="border-b border-border py-14 sm:py-20">
          <Container>
            <div className="max-w-xl space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                How taxi-top advertising works in Nairobi
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Admobi mounts connected LED screens on partner taxis operating across Nairobi&apos;s busiest corridors. Brands book by geography and time window — not by guessing which billboard a target audience passes. Every play is GPS-verified, so you know exactly where your creative ran.
              </p>
            </div>
          </Container>
        </section>
        <FaqSection />
        <GetStartedSection />
      </main>
      <SiteFooter />
      <MobileStickyCta />
      <div className="h-[4.75rem] lg:hidden" aria-hidden />
    </>
  )
}
