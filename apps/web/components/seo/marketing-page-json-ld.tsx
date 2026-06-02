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
}

export function MarketingPageJsonLd({
  path,
  name,
  description,
  breadcrumbs,
  faqItems,
  pageUrl: pageUrlOverride,
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
        })}
      />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbs)} />
      {faqItems ? <JsonLd data={faqPageJsonLd(faqItems, pageUrl)} /> : null}
    </>
  )
}
