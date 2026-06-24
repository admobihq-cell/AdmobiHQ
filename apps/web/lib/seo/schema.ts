import type { FaqItem } from "@/lib/seo/faq-data"
import { advertiserFaqItems } from "@/lib/seo/faq-data"
import { SEO_LAST_UPDATED } from "@/lib/seo/site-updates"
import { SITE_LOGO_URL, SITE_NAME, SITE_URL } from "@/lib/seo/site"

const ORGANIZATION_ID = `${SITE_URL}/#organization`

export function faqPageJsonLd(items: readonly FaqItem[], pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  }
}

export function breadcrumbListJsonLd(
  items: readonly { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path.startsWith("http")
        ? item.path
        : item.path === "/"
          ? SITE_URL
          : `${SITE_URL}${item.path}`,
    })),
  }
}

export function marketingWebPageJsonLd({
  path,
  name,
  description,
  url: urlOverride,
}: {
  path: string
  name: string
  description: string
  url?: string
}) {
  const url = urlOverride ?? (path === "/" ? SITE_URL : `${SITE_URL}${path}`)
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "en-KE",
    dateModified: SEO_LAST_UPDATED,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": ORGANIZATION_ID },
  }
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en-KE",
  publisher: { "@id": ORGANIZATION_ID },
}

export const homepageGraphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Admobi",
      alternateName: "AdmobiHQ",
      url: SITE_URL,
      logo: SITE_LOGO_URL,
      description:
        "Kenya's digital out-of-home advertising network. Geo-targeted LED taxi-top screens and delivery bike enclosures in Nairobi and beyond.",
      areaServed: ["Nairobi", "Kenya"],
      foundingLocation: { "@type": "Place", name: "Nairobi, Kenya" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        url: `${SITE_URL}/start-campaign`,
      },
      sameAs: ["https://wa.me/254703643560"],
    },
    {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#localbusiness`,
      name: "Admobi",
      description: "Digital taxi-top and delivery bike OOH advertising in Nairobi, Kenya.",
      url: SITE_URL,
      telephone: "+254703643560",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Nairobi",
        addressCountry: "KE",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: -1.2921,
        longitude: 36.8219,
      },
      priceRange: "KES",
      openingHours: "Mo-Fr 08:00-18:00",
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#taxitop-service`,
      name: "Taxi-top LED advertising",
      serviceType: "Out-of-home advertising",
      provider: { "@id": ORGANIZATION_ID },
      areaServed: { "@type": "City", name: "Nairobi" },
      description:
        "Geo-targeted LED screens mounted on partner taxis across Nairobi. Book by corridor and time window. GPS-verified proof-of-play.",
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        areaServed: "Nairobi, Kenya",
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#bikead-service`,
      name: "Delivery bike advertising enclosures",
      serviceType: "Out-of-home advertising",
      provider: { "@id": ORGANIZATION_ID },
      areaServed: { "@type": "City", name: "Nairobi" },
      description:
        "Digital advertising enclosures on last-mile delivery bikes. Targets dense estates and lunch-hour corridors where taxis are sparse.",
    },
    marketingWebPageJsonLd({
      path: "/",
      name: "Taxi-top LED advertising in Nairobi | Admobi",
      description:
        "Geotargeted LED taxi-top advertising in Kenyan cities. Launch campaigns with geo and schedule control, from one-day bursts to sustained books.",
    }),
    faqPageJsonLd(advertiserFaqItems, `${SITE_URL}/`),
  ],
}
