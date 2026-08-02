import type { Metadata } from "next"

import { ContactSupportForm } from "@/components/help/contact-support-form"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { pageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = pageMetadata({
  title: "Contact support | Admobi Kenya",
  description:
    "Open a support request with the Admobi team — billing, campaigns, technical issues, or driver questions.",
  path: "/help/contact",
})

export default function ContactSupportPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/help/contact"
        name="Contact support"
        description="Open a support request with the Admobi team."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "Contact", path: "/help/contact" },
        ]}
      />
      <ContactSupportForm />
    </>
  )
}
