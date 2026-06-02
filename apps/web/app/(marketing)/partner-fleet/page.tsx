import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { fleetFaqItems } from "@/lib/seo/faq-data"
import { pageMetadata } from "@/lib/seo/site"

import PartnerFleetClient from "./partner-fleet-client"

export const metadata = pageMetadata({
  title: "Partner your fleet — taxi & delivery bike OOH | Admobi Kenya",
  description:
    "Monetize taxis and delivery bikes with Admobi LED screens in Kenya. We install hardware, sell media, and share revenue with fleet partners in Nairobi and rollout cities.",
  path: "/partner-fleet",
})

export default function PartnerFleetPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/partner-fleet"
        name="Partner your fleet — taxi & delivery bike OOH | Admobi Kenya"
        description="Monetize taxis and delivery bikes with Admobi LED screens. Hardware, media sales, and revenue share for fleet partners."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Partner your fleet", path: "/partner-fleet" },
        ]}
        faqItems={fleetFaqItems}
      />
      <PartnerFleetClient />
    </>
  )
}
