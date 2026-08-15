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
    heading: "Documents you submit as a driver",
    body: "As part of the driver profile-setup process, we collect a National ID, a profile photo, your KRA PIN, and payout details (M-Pesa number or bank account) so we can verify your identity, meet tax compliance requirements, and pay you correctly. These documents are stored in private object storage and are never given a public URL — they can only be viewed by you and by authorized Admobi ops staff reviewing your application, through an access-controlled connection. We keep driver documents for as long as your driver account is active, plus a period afterward as required for compliance and dispute resolution.",
  },
  {
    heading: "Cookies",
    body: "Our website uses error-tracking (Sentry) to help us find and fix bugs; on admobihq.com we also use Google Analytics to understand site traffic. Both are optional and only run if you accept them in the cookie banner — if you choose \"Essential only,\" neither loads. We also use Vercel Web Analytics, which does not use cookies or store any identifier about you, so it isn't affected by your choice. You can change your choice at any time by clearing your browser's site data and reloading the page.",
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
