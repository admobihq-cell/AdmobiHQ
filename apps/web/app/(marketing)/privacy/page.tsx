import { LegalPage } from "@/components/landing/legal-page"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "How Admobi collects, uses, and protects personal data from advertisers, fleet partners, and drivers in Kenya.",
  path: "/privacy",
})

const sections = [
  {
    heading: "Data we collect",
    body: "When you submit a form, we collect the details you provide (such as name, email, phone, and campaign or fleet information) so we can respond to your request.",
  },
  {
    heading: "How we use it",
    body: "We use your information to review applications, send confirmations, prepare quotes, and operate the Admobi network. We do not sell personal data to third parties.",
  },
  {
    heading: "Retention",
    body: "We keep submissions for as long as needed to manage programmes and comply with law. You may request deletion by contacting us at the email address on our website.",
  },
  {
    heading: "Contact",
    body: "For privacy questions, email admobihq@gmail.com. This policy may be updated as programmes expand.",
  },
] as const

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This policy describes how Admobi handles personal information collected through admobihq.com and related lead forms."
      sections={sections}
    />
  )
}
