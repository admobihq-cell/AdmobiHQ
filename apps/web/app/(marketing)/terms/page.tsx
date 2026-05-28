import { LegalPage } from "@/components/landing/legal-page"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Terms of use",
  description:
    "Terms governing use of the Admobi website and submission of campaign, fleet, and driver enquiries in Kenya.",
  path: "/terms",
})

const sections = [
  {
    heading: "Website use",
    body: "Content on this site is provided for information about Admobi programmes. Do not misuse the site, attempt unauthorised access, or scrape content in violation of our robots policy.",
  },
  {
    heading: "Enquiries and programmes",
    body: "Submitting a form does not create a binding contract. Campaign, fleet, and driver terms are confirmed separately in writing before hardware install or media flights.",
  },
  {
    heading: "Accuracy",
    body: "Specifications, reach figures, and city rollout details may change. Final terms appear in signed agreements and the media kit issued to approved partners.",
  },
  {
    heading: "Governing law",
    body: "These terms are governed by the laws of Kenya. For questions, contact admobihq@gmail.com.",
  },
] as const

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="By using admobihq.com you agree to the following terms. Programme-specific contracts apply once you are onboarded."
      sections={sections}
    />
  )
}
