import {
  PRICING_DISCLAIMER,
  deliveryBikeTiers,
  formatKes,
  pricingTiers,
  taxiTopTiers,
} from "@/lib/seo/pricing-data"
import { SEO_LAST_UPDATED } from "@/lib/seo/site-updates"
import { SITE_URL } from "@/lib/seo/site"

function tierSectionMarkdown(title: string, tiers: typeof pricingTiers): string {
  const blocks = tiers.map((tier) => {
    const includes = tier.includes.map((item) => `  - ${item}`).join("\n")
    const notes = tier.notes ? `\n- **Notes:** ${tier.notes}` : ""
    return `### ${tier.name}

- **Starting from:** ${formatKes(tier.startingFromKes)}
- **Duration:** ${tier.duration}
- **Geography:** ${tier.geography}
- **Includes:**
${includes}${notes}`
  })
  return `## ${title}\n\n${blocks.join("\n\n")}`
}

export function buildPricingMarkdown(): string {
  return `# Pricing — Admobi (Kenya digital OOH)

> ${PRICING_DISCLAIMER}
>
> Last updated: ${SEO_LAST_UPDATED}

Admobi sells geo-targeted **taxi-top LED** and **delivery bike enclosure** advertising in Nairobi, Kenya. Minimum flights can start from a single day where inventory allows.

**Confirm a quote:** ${SITE_URL}/start-campaign  
**Human-readable pricing page:** ${SITE_URL}/pricing

${tierSectionMarkdown("Taxi-top LED", taxiTopTiers)}

${tierSectionMarkdown("Delivery bike enclosures", deliveryBikeTiers)}

## Add-ons (quote on brief)

- Additional corridors or cities on the Kenya rollout map
- Creative production or rush trafficking
- Exclusivity by category or corridor
- Event or election flight compliance review (where permitted)
`
}

export function buildLlmsTxt(): string {
  return `# Admobi

> Admobi (AdmobiHQ) is Kenya's digital out-of-home (OOH) network: geo-targeted LED taxi-top screens and delivery bike advertising enclosures. Advertisers book by corridor and time window in Nairobi-first, with GPS-verified proof-of-play. Fleet partners and drivers join through separate onboarding flows.

## Audiences

- **Advertisers:** Brands, SMEs, corporates, and event teams buying motion-led outdoor media
- **Fleet partners:** Taxi and delivery fleets monetizing vehicles at scale
- **Drivers:** Individual taxi and delivery riders earning monthly via verified screen hours

## Key pages

- [Home](${SITE_URL}/): Taxi-top LED advertising in Nairobi
- [Products & solutions](${SITE_URL}/products-solutions): Taxi tops, delivery bikes, geo-targeting
- [Indicative pricing](${SITE_URL}/pricing): Starting-from KES tiers (confirmed per brief)
- [Machine-readable pricing](${SITE_URL}/pricing.md): Structured pricing for AI agents
- [Start a campaign](${SITE_URL}/start-campaign): Advertiser brief and sales contact
- [Partner your fleet](${SITE_URL}/partner-fleet): Fleet partnership applications
- [Driver sign-up](${SITE_URL}/drivers): Driver applications
- [Media kit](${SITE_URL}/media-kit): Creative specifications request
- [Blog](${SITE_URL}/blog): OOH insights, campaigns, and product updates
- [Help center](${SITE_URL}/help): Guides for advertisers, drivers, and fleet partners

## Contact

- Sales / campaigns: ${SITE_URL}/start-campaign
- WhatsApp: https://wa.me/254703643560
- Phone: +254703643560

## Crawling

- [robots.txt](${SITE_URL}/robots.txt): AI search bots allowed; training opt-out via content signals
- [Sitemap](${SITE_URL}/sitemap.xml)
`
}
