import { SITE_NAME, SITE_URL } from "@/lib/seo/site"

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en-KE",
}

export const homepageGraphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://admobihq.com/#organization",
      name: "Admobi",
      alternateName: "AdmobiHQ",
      url: "https://admobihq.com",
      logo: "https://admobihq.com/opengraph-image",
      description:
        "Kenya's digital out-of-home advertising network. Geo-targeted LED taxi-top screens and delivery bike enclosures in Nairobi and beyond.",
      areaServed: ["Nairobi", "Kenya"],
      foundingLocation: { "@type": "Place", name: "Nairobi, Kenya" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        url: "https://admobihq.com/start-campaign",
      },
      sameAs: ["https://wa.me/254703643560"],
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://admobihq.com/#localbusiness",
      name: "Admobi",
      description: "Digital taxi-top and delivery bike OOH advertising in Nairobi, Kenya.",
      url: "https://admobihq.com",
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
      "@id": "https://admobihq.com/#taxitop-service",
      name: "Taxi-top LED advertising",
      serviceType: "Out-of-home advertising",
      provider: { "@id": "https://admobihq.com/#organization" },
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
      "@id": "https://admobihq.com/#bikead-service",
      name: "Delivery bike advertising enclosures",
      serviceType: "Out-of-home advertising",
      provider: { "@id": "https://admobihq.com/#organization" },
      areaServed: { "@type": "City", name: "Nairobi" },
      description:
        "Digital advertising enclosures on last-mile delivery bikes. Targets dense estates and lunch-hour corridors where taxis are sparse.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What creative formats does Admobi accept?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Video and static packages sized to the unit spec. Loop length, safe zones, and codecs are listed in the media kit.",
          },
        },
        {
          "@type": "Question",
          name: "How quickly can we launch a taxi-top campaign in Nairobi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Short flights are possible when inventory and compliance checks line up. Contact Admobi with your brief for a timeline.",
          },
        },
        {
          "@type": "Question",
          name: "Does Admobi cover counties outside Nairobi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nairobi is the first production footprint. Nakuru, Eldoret, and Mombasa are next on the rollout roadmap.",
          },
        },
        {
          "@type": "Question",
          name: "What is the minimum spend or campaign duration for Admobi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Campaigns can start from a single day where inventory allows. Final pricing is confirmed with your brief.",
          },
        },
      ],
    },
  ],
}
