import Image from "next/image"

import { Container } from "./container"
import { AudiencesSection } from "./audiences"
import { CampaignFloorSection } from "./campaign-floor"
import { CtaBandSection } from "./cta-band"
import { FaqSection } from "./faq"
import { FormsSection } from "./forms-section"
import { HeroSection } from "./hero"
import { MarketsSection } from "./markets"
import { MediaKitSection } from "./media-kit"
import { MobileStickyCta } from "./mobile-sticky-cta"
import { ProcessSection } from "./process"
import { ProductSection } from "./product-section"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"
import { SocialProofSection } from "./social-proof"
import { WhyTaxisSection } from "./why-taxis"

export function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <WhyTaxisSection />
        <ProductSection />
        <AudiencesSection />
        <MarketsSection />
        <CampaignFloorSection />
        <ProcessSection />
        <SocialProofSection />
        <CtaBandSection />
        <FormsSection />
        <MediaKitSection />
        <section className="border-b border-border py-10 sm:py-12">
          <Container>
            <p className="text-muted-foreground mb-4 text-xs font-medium uppercase tracking-wider">
              Brand kit reference board
            </p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border">
              <Image
                src="/brand/admobi-brand-kit.png"
                alt="Admobi identity overview: logo, palette, typography, and applications."
                fill
                className="object-cover object-top"
                sizes="(max-width: 1152px) 100vw, 1152px"
                priority={false}
              />
            </div>
          </Container>
        </section>
        <FaqSection />
        <SiteFooter />
      </main>
      <MobileStickyCta />
      <div className="h-[4.75rem] lg:hidden" aria-hidden />
    </>
  )
}
