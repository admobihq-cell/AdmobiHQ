import { JsonLd } from "@/components/seo/json-ld"
import type { FaqItem } from "@/lib/seo/faq-data"
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  marketingWebPageJsonLd,
} from "@/lib/seo/schema"
import { SITE_URL } from "@/lib/seo/site"

type MarketingPageJsonLdProps = {
  path: string
  name: string
  description: string
  breadcrumbs: readonly { name: string; path: string }[]
  faqItems?: readonly FaqItem[]
  /** Override canonical page URL (rare; defaults to SITE_URL + path). */
  pageUrl?: string
  /** ISO date this page last changed; defaults to the site-wide SEO_LAST_UPDATED. */
  dateModified?: string
}

export function MarketingPageJsonLd({
  path,
  name,
  description,
  breadcrumbs,
  faqItems,
  pageUrl: pageUrlOverride,
  dateModified,
}: MarketingPageJsonLdProps) {
  const pageUrl =
    pageUrlOverride ?? (path === "/" ? SITE_URL : `${SITE_URL}${path}`)

  return (
    <>
      <JsonLd
        data={marketingWebPageJsonLd({
          path,
          name,
          description,
          url: pageUrl,
          dateModified,
        })}
      />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbs)} />
      {faqItems ? <JsonLd data={faqPageJsonLd(faqItems, pageUrl)} /> : null}
    </>
  )
}
