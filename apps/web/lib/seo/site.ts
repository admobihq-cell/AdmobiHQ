import type { Metadata } from "next"

export const SITE_URL = "https://admobihq.com"
export const SITE_NAME = "Admobi"
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image"
/** Absolute URL for og:image and twitter:image crawlers. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`

const GEO_META = {
  "geo.region": "KE-110",
  "geo.placename": "Nairobi",
} as const

type PageMetadataInput = {
  title: string
  description: string
  path: string
}

/** Per-route metadata with canonical URL and Open Graph defaults. */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const canonical = path === "/" ? SITE_URL : `${SITE_URL}${path}`

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: { "en-ke": `${SITE_URL}/` },
    },
    other: GEO_META,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_KE",
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — Digital taxi-top OOH in Kenya`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}
