# SEO & AEO implementation reference

Concrete reference for how search and answer-engine optimization is wired up in `apps/web` — the actual metadata, schema, keyword strings, and generated files, as they exist in code today. This complements `AI-SEO-MONITORING.md` (the ongoing checklist) and `AI-SEO-PHASE2.md` (the content roadmap), which assume this implementation but don't spell it out.

## Architecture at a glance

No `next-seo` or similar library — this is a small hand-rolled system under `apps/web/lib/seo/`:

| File | Purpose |
|---|---|
| `lib/seo/site.ts` | Site constants + `pageMetadata()` / `blogPageMetadata()` — the `Metadata` builder every page uses |
| `lib/seo/schema.ts` | JSON-LD builders: `Organization`, `LocalBusiness`, `Service`, `WebPage`, `FAQPage`, `BreadcrumbList`, `WebSite`, plus the homepage `@graph` |
| `lib/seo/faq-data.ts` | FAQ question/answer content consumed by `FAQPage` schema |
| `lib/seo/site-updates.ts` | `SEO_LAST_UPDATED` — feeds `dateModified` in JSON-LD |
| `lib/seo/robots-content-signals.js` | Post-processes next-sitemap's generated `robots.txt`: adds AI-crawler allow rules + a Content-Signal preamble |
| `lib/seo/static-ai-files.ts` | Generates `llms.txt` and `/pricing.md` content from `pricing-data.ts` |
| `next-sitemap.config.js` | Drives `public/sitemap.xml` / `public/robots.txt` generation |
| `components/seo/json-ld.tsx`, `components/seo/marketing-page-json-ld.tsx` | Render JSON-LD `<script>` tags from the builders above |

## Site-wide constants (`lib/seo/site.ts`)

- `SITE_URL = "https://admobihq.com"`, `SITE_NAME = "Admobi"`
- `INDEXABLE_ROBOTS = { index: true, follow: true }` — applied to every page via `pageMetadata()`
- `GEO_META = { "geo.region": "KE-110", "geo.placename": "Nairobi" }` — injected into every page's `other` meta
- OG/icon routes: `/opengraph-image` (1200×630), `/icon`, `/logo` (512×512, comment notes ≥112×112 needed for schema.org rich results)

`pageMetadata({ title, description, path })` is the builder every route's `metadata` export calls. It sets:
- `title: { absolute: title }` (no title template — each page's title string is used verbatim)
- `alternates.canonical` = `SITE_URL` (home) or `SITE_URL + path`
- `openGraph`: siteName "Admobi", locale `en_KE`, type `website`, one image at `/opengraph-image`
- `twitter`: `summary_large_image` card
- `robots`: always indexable, plus the Nairobi geo meta tags

`blogPageMetadata()` wraps this and overrides `openGraph.siteName` to `"Admobi Blog"` and `type` to `article` (post) or `website` (index).

**There is no `<meta name="keywords">` and no keyword array anywhere in the codebase** (confirmed by grep across `apps/web/app/(marketing)/**/page.tsx` and `site.ts`) — this is deliberate: the `keywords` meta tag is ignored by Google and other major engines, and the AEO skill playbook (`.agents/skills/ai-seo/`) documents that keyword stuffing measurably *hurts* AI-answer-engine visibility (−10% per Princeton GEO research). Target phrases instead live directly in page titles, descriptions, headings, and JSON-LD — see the table below.

## Per-page titles, descriptions, target phrases

Pattern for primary conversion pages: `{Descriptive phrase} | {keyword phrase} | Admobi Kenya`. Home uses `| Admobi`; legal pages (`/privacy`, `/terms`) and the internal `/design-system` page use a bare title with no suffix.

| Route | Title | Description |
|---|---|---|
| `/` (home) | Taxi-top LED advertising in Nairobi \| Admobi | Geotargeted LED taxi-top advertising in Kenyan cities. Launch campaigns with geo and schedule control, from one-day bursts to sustained books. |
| `/pricing` | Taxi-top OOH pricing & campaign simulator \| Admobi Kenya | Admobi prices taxi-top LED by the play: screens, slot length, zone, and volume. Simulate your campaign cost live, or compare Zone select, All-screens, and Enterprise plans. |
| `/products-solutions` | Digital OOH products \| taxi tops & delivery bikes \| Admobi Kenya | Run geo-targeted taxi-top LED and delivery bike advertising in Nairobi. Geo-aware scheduling, proof-of-play, and flexible flights from one day. Admobi Kenya. |
| `/drivers` | Driver sign-up \| earn with taxi-top screens \| Admobi Kenya | Join Admobi as a taxi or delivery driver in Nairobi, Mombasa, or Kisumu. Free LED screen install, monthly M-Pesa payouts from verified screen hours. |
| `/partner-fleet` | Partner your fleet \| taxi & delivery bike OOH \| Admobi Kenya | Monetize taxis and delivery bikes with Admobi LED screens in Kenya. We install hardware, sell media, and share revenue with fleet partners in Nairobi and rollout cities. |
| `/blog` | Blog \| taxi-top OOH insights & campaigns \| Admobi Kenya | Articles on digital out-of-home, taxi-top LED campaigns, and Admobi product updates from Nairobi and Kenya. |
| `/help` | Help center \| taxi-top OOH guides & FAQs \| Admobi Kenya | Guides for advertisers, drivers, and fleet partners on Admobi taxi-top LED and delivery bike OOH in Nairobi and Kenya. |
| `/product-demo` | Try the Admobi app \| interactive product demo \| Admobi Kenya | — |
| `/help/contact` | Contact support \| Admobi Kenya | — |
| `/privacy` | Privacy policy | (no keyword targeting — not meant to rank) |
| `/terms` | Terms of use | (no keyword targeting — not meant to rank) |

**Recurring target phrases** across titles/descriptions/FAQ content: *taxi-top LED advertising, taxi-top OOH, digital OOH (Kenya), delivery bike advertising / enclosures, Nairobi, Kenya, geo-targeted, proof-of-play, campaign simulator.*

These match the monitoring query set tracked monthly in `AI-SEO-MONITORING.md`: "taxi top advertising Nairobi", "taxi top advertising Kenya", "digital OOH Kenya", "geo targeted outdoor advertising Kenya", "Admobi", "AdmobiHQ", "delivery bike advertising Nairobi", "taxi top advertising cost Nairobi".

Each of pricing/products-solutions/drivers/partner-fleet/blog/help also renders `<MarketingPageJsonLd>` with its own `WebPage` + `BreadcrumbList` schema (and, for `/drivers`, `FAQPage` schema via `driverFaqItems`).

## Structured data (`lib/seo/schema.ts`)

Only the homepage renders the full `@graph` (`homepageGraphJsonLd`), combining:

- **Organization** (`#organization`) — name "Admobi", alternateName "AdmobiHQ", logo, description ("Kenya's digital out-of-home advertising network. Geo-targeted LED taxi-top screens and delivery bike enclosures in Nairobi and beyond."), `areaServed: ["Nairobi", "Kenya"]`, `sameAs`: WhatsApp (`wa.me/254703643560`), Instagram, TikTok, LinkedIn.
- **LocalBusiness** (`#localbusiness`) — telephone `+254703643560`, address (Nairobi, KE — no street/postal code), geo coordinates (-1.2921, 36.8219), `priceRange: "KES"`, `openingHours: "Mo-Fr 08:00-18:00"`.
- **Service × 2** — Taxi-top LED advertising (`#taxitop-service`, has an `Offer` with `InStock` availability) and Delivery bike advertising enclosures (`#bikead-service`, no `Offer` block).
- **WebPage** (`#webpage`) — home's title/description, `dateModified: SEO_LAST_UPDATED`.
- **FAQPage** — built from `advertiserFaqItems` (see `faq-data.ts`).

Other marketing pages use the lighter `marketingWebPageJsonLd()` + `breadcrumbListJsonLd()` (+ optional `faqPageJsonLd()`) via the `MarketingPageJsonLd` component, not the full graph.

## Sitemap & robots (`next-sitemap.config.js`)

- `siteUrl` from `NEXT_PUBLIC_SERVER_URL` (falls back to `https://admobihq.com`)
- `generateRobotsTxt` gated on `NEXT_PUBLIC_ALLOW_INDEXING !== "false"` — a global kill switch for non-production environments
- Excludes API/admin/OG-image/icon routes from the sitemap
- `additionalPaths()` injects `/pricing` (priority 0.8), `/llms.txt` and `/pricing.md` (priority 0.6), plus dynamic blog/help paths fetched from Payload (`fetchBlogSitemapPaths`, `fetchHelpSitemapPaths`)
- `transform()`: priority 0.5 for `/privacy` and `/terms`, 0.8 for everything else; `changefreq: monthly`
- `robotsTxtOptions.transformRobotsTxt` calls `enhanceRobotsTxt()` from `robots-content-signals.js` to post-process the generated `robots.txt`

## AI-crawler policy (`lib/seo/robots-content-signals.js`)

- Content-Signal preamble (citing EU Directive 2019/790 / contentsignals.org) documenting the active policy: **`ai-train=no, search=yes, ai-input=yes`** — i.e. AI search/answer engines may crawl and cite the site, and content may be used as live input to an AI answer, but not used to train models. Also exported as `CONTENT_SIGNAL_HEADER` for use as an HTTP response header, since major crawlers don't parse `Content-Signal:` out of `robots.txt`.
- Explicit `Allow: /` blocks for 12 AI/search user agents: `GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, GoogleOther, Google-Extended, Googlebot, bingbot, OAI-SearchBot, cohere-ai, YouBot`.
- Standard `Disallow: /api/`, `/admin/` (plus generic `/wp-admin/`, `/wp-content/`, `/xmlrpc.php` hardening — boilerplate scanner-deterrence, not reflective of actual site structure, since this isn't WordPress).
- Output lands in `public/robots.txt`, referencing `Sitemap: https://admobihq.com/sitemap.xml`.

## AEO: machine-readable files (`lib/seo/static-ai-files.ts`)

- **`public/llms.txt`** — the llms.txt convention file. Content: one-line summary of Admobi, an Audiences section (Advertisers / Fleet partners / Drivers), a Key pages section linking home, products-solutions, pricing, `/pricing.md`, start-campaign, partner-fleet, drivers, media-kit, blog, help — each with a one-line description, a Contact section (sales link, WhatsApp, phone), and a Crawling section noting AI search bots are allowed with training opt-out via content signals, plus the sitemap link.
- **`public/pricing.md`** — a plain-markdown, fully worked pricing reference for AI agents/answer engines: the taxi-top formula (`total = base_price_per_play × slot_multiplier × zone_multiplier × volume_multiplier × plays_per_day × screens × days`), multiplier tables, a worked example (KES 4,368), plan tiers, the delivery-bike per-side/day formula with its own worked example (KES 176,400), and add-ons.
- Both files are generated from `pricing-data.ts`, which re-exports from the shared `packages/ops-contracts/src/pricing.ts` — the same pricing contract used by the in-app campaign wizard, so `/pricing.md` cannot drift from real pricing. Regenerate with `npm run generate:ai-seo` in `apps/web` after any pricing change, and bump `SEO_LAST_UPDATED` (`site-updates.ts`) after material marketing-copy edits.

## Why keyword-array SEO was skipped

Per the internal `.agents/skills/ai-seo/` playbook this implementation follows: the `<meta keywords>` tag has been ignored by Google since ~2009 and carries no weight with AI answer engines either. Their research instead shows AI-answer-engine citation rate improves with structure and evidence (citing sources +40%, statistics +37%, quotations +30%, authoritative tone +25%) and actively drops with keyword stuffing (−10%). This codebase's approach — target phrases folded naturally into titles/descriptions/headings, plus machine-readable `/pricing.md` and `/llms.txt`, plus FAQ/Service/LocalBusiness schema — follows that guidance directly rather than using a keyword list.

## Related docs

- `docs/web/AI-SEO-MONITORING.md` — the recurring post-deploy technical checklist and the monthly query-citation tracking log
- `docs/web/AI-SEO-PHASE2.md` — content roadmap (definitive guides, how-tos, comparison pages, city pages) and CMS requirements for future AEO content
- `.agents/skills/ai-seo/SKILL.md` and `references/content-patterns.md` — the generic AEO/GEO playbook this implementation applies (not Admobi-specific; reusable content-block templates and the AI-search-engine landscape)
