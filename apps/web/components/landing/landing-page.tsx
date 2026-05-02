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
        <FaqSection />
        <GetStartedSection />
      </main>
      <SiteFooter />
      <MobileStickyCta />
      <div className="h-[4.75rem] lg:hidden" aria-hidden />
    </>
  )
}
