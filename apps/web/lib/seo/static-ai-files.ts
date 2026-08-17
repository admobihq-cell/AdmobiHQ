import {
  BASE_PRICE_PER_PLAY_KES,
  PRICING_DISCLAIMER,
  REFERENCE_SLOT_SECONDS,
  allScreensFlatMultiplier,
  deliveryBikeTiers,
  formatKes,
  planTiers,
  slotLengthOptions,
  volumeTiers,
  zoneTiers,
} from "@/lib/seo/pricing-data"
import { SEO_LAST_UPDATED } from "@/lib/seo/site-updates"
import { SITE_URL } from "@/lib/seo/site"

export function buildPricingMarkdown(): string {
  const slotRows = slotLengthOptions
    .map((s) => `| ${s.label} | ${s.multiplier.toFixed(1)}x |`)
    .join("\n")
  const zoneRows = zoneTiers
    .map((z) => `| ${z.name} | ${z.multiplier.toFixed(1)}x | ${z.examples.join(", ")} |`)
    .join("\n")
  const volumeRows = volumeTiers
    .map((v) => `| ${v.label} | ${v.multiplier.toFixed(1)}x |`)
    .join("\n")
  const planBlocks = planTiers
    .map(
      (plan) => `### ${plan.name}

- **Tagline:** ${plan.tagline}
- **Price:** ${plan.priceNote}
${plan.bullets.map((b) => `- ${b}`).join("\n")}`,
    )
    .join("\n\n")
  const bikeBlocks = deliveryBikeTiers
    .map(
      (tier) => `### ${tier.name}

- **Starting from:** ${formatKes(tier.startingFromKes)}
- **Duration:** ${tier.duration}
- **Geography:** ${tier.geography}
- **Includes:**
${tier.includes.map((item) => `  - ${item}`).join("\n")}`,
    )
    .join("\n\n")

  return `# Pricing: Admobi (Kenya digital OOH)

> ${PRICING_DISCLAIMER}
>
> Last updated: ${SEO_LAST_UPDATED}

Admobi sells geo-targeted **taxi-top LED** advertising in Nairobi, Kenya, priced per play (spot/loop rotation) rather than per second, plus **delivery bike enclosure** advertising sold as flat flights.

**Confirm a quote:** ${SITE_URL}/start-campaign
**Human-readable pricing page:** ${SITE_URL}/pricing
**Simulator:** ${SITE_URL}/pricing#simulator

## Taxi-top LED: spot/play formula

\`\`\`
total = base_price_per_play × slot_multiplier × zone_multiplier × volume_multiplier × plays_per_day × screens × days
\`\`\`

- **Base price per play:** ${formatKes(BASE_PRICE_PER_PLAY_KES)}, at the ${REFERENCE_SLOT_SECONDS}s reference slot, per screen
- Multipliers are illustrative and confirmed per brief; loop capacity (max sellable plays/day per screen) is confirmed at booking.

### Slot length multiplier (sub-linear)

| Slot length | Multiplier |
| --- | --- |
${slotRows}

### Zone multiplier

| Zone tier | Multiplier | Example Nairobi areas |
| --- | --- | --- |
${zoneRows}
| All screens (flat, no zone picked) | ${allScreensFlatMultiplier.toFixed(1)}x | Every zone above, network-wide |

### Volume multiplier

| Screens booked | Multiplier |
| --- | --- |
${volumeRows}

### Worked example

1 screen, Premium zone (Kilimani), 15s slot, 20 plays/day, 14 days:
${BASE_PRICE_PER_PLAY_KES} × 1.3 × 1.5 × 1.0 × 20 plays × 1 screen × 14 days = **KES 4,368 total**

## Ways to book

${planBlocks}

## Delivery bike enclosures (flat flights, static inventory)

${bikeBlocks}

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
- [Indicative pricing](${SITE_URL}/pricing): Spot/play pricing formula, campaign simulator, and zone rate card (confirmed per brief)
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
