import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { driverFaqItems } from "@/lib/seo/faq-data"
import { pageMetadata } from "@/lib/seo/site"

import DriversClient from "./drivers-client"

export const metadata = pageMetadata({
  title: "Driver sign-up — earn with taxi-top screens | Admobi Kenya",
  description:
    "Join Admobi as a taxi or delivery driver in Nairobi, Mombasa, or Kisumu. Free LED screen install, monthly M-Pesa payouts from verified screen hours.",
  path: "/drivers",
})

export default function DriversPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/drivers"
        name="Driver sign-up — earn with taxi-top screens | Admobi Kenya"
        description="Join Admobi as a taxi or delivery driver. Free install, monthly M-Pesa payouts from verified screen hours."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Drivers", path: "/drivers" },
        ]}
        faqItems={driverFaqItems}
      />
      <DriversClient />
    </>
  )
}
