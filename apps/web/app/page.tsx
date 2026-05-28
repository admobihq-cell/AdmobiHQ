import { LandingPage } from "@/components/landing/landing-page"
import { JsonLd } from "@/components/seo/json-ld"
import { faqPageJsonLd } from "@/lib/seo/schema"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Digital taxi-top OOH in Nairobi",
  description:
    "Geotargeted LED taxi-top advertising in Kenyan cities. Launch campaigns with geo and schedule control, from one-day bursts to sustained books.",
  path: "/",
})

export default function Page() {
  return (
    <>
      <JsonLd data={faqPageJsonLd} />
      <LandingPage />
    </>
  )
}
