import { faqItems } from "@/lib/seo/faq-data"
import { SITE_NAME, SITE_URL } from "@/lib/seo/site"

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Geotargeted LED taxi-top out-of-home advertising in Kenyan cities, starting in Nairobi.",
  areaServed: {
    "@type": "Country",
    name: "Kenya",
  },
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en-KE",
}

export const faqPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: {
      "@type": "Answer",
      text: a,
    },
  })),
}
