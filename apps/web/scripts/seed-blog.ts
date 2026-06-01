/**
 * Seed blog posts (with generated cover art) into Payload.
 *
 * Usage (from repo root):
 *   npm run seed:blog -w web
 *   npm run seed:blog:ci -w web   # CI / env from process (no .env.local file)
 */

import "../lib/load-env.ts"

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"
import type { Payload } from "payload"
import sharp from "sharp"

import { getPayloadClient } from "@/lib/payload/get-payload"

type BlogTopic = "ooh" | "campaigns" | "product" | "company" | "insights"

type SeedPost = {
  slug: string
  title: string
  excerpt: string
  topic: BlogTopic
  featured: boolean
  publishedAt: string
  authorName: string
  authorRole: string
  seoTitle: string
  seoDescription: string
  cover: {
    alt: string
    badge: string
    headline: [string, string]
    subtitle: string
    filename: string
  }
  body: SerializedEditorState
}

function textNode(text: string) {
  return {
    type: "text",
    text,
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    version: 1,
  }
}

function paragraph(text: string) {
  return {
    type: "paragraph",
    children: [textNode(text)],
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    version: 1,
  }
}

function heading(text: string, tag: "h2" | "h3") {
  return {
    type: "heading",
    tag,
    children: [textNode(text)],
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    version: 1,
  }
}

function richText(
  ...blocks: Array<ReturnType<typeof paragraph> | ReturnType<typeof heading>>
): SerializedEditorState {
  return {
    root: {
      type: "root",
      children: blocks,
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
    },
  }
}

const SEED_POSTS: SeedPost[] = [
  {
    slug: "traditional-ooh-vs-moving-led-taxi-tops-kenya",
    title: "Traditional advertising vs moving LED taxi tops in Kenya",
    excerpt:
      "How static billboards, broadcast, and print compare to geo-targeted taxi-top LED and delivery bike OOH in Nairobi — mobility, proof, and minimum flights.",
    topic: "ooh",
    featured: true,
    publishedAt: "2026-06-01T09:00:00.000Z",
    authorName: "Admobi editorial",
    authorRole: "OOH & campaigns",
    seoTitle: "Traditional OOH vs moving LED taxi tops in Kenya | Admobi Blog",
    seoDescription:
      "Compare static billboards, radio, print, and social with geo-targeted taxi-top LED and delivery bike OOH in Nairobi — targeting, proof-of-play, and flight length.",
    cover: {
      alt: "Illustrated cover: Traditional OOH versus moving LED taxi-top advertising in Nairobi",
      badge: "ADMOBI BLOG",
      headline: ["Traditional OOH vs", "moving LED taxi tops"],
      subtitle: "Nairobi advertiser guide",
      filename: "traditional-ooh-comparison-cover.png",
    },
    body: richText(
      paragraph(
        "Kenyan advertisers still spread budget across channels that were built for a different media landscape: fixed roadside boards, broadcast slots, and print runs that cannot follow where Nairobi actually moves. Moving LED taxi tops and geo-scheduled delivery bike enclosures are not a replacement for every line item — they answer a specific gap: reach that travels with traffic, proof that plays happened, and flights short enough to test before you commit a quarter.",
      ),
      heading("What we mean by “traditional” channels", "h2"),
      paragraph(
        "In this guide, “traditional” means formats that do not move with the audience or do not report plays at route level: static billboards, radio and TV spots, newspaper and magazine placements, flyers, and unlit roadside panels. We compare them fairly on planning, targeting, proof, and minimum flight length — without ranking brands or vendors.",
      ),
      heading("Static billboards and unlit roadside panels", "h2"),
      paragraph(
        "A static board owns one sight line. That is powerful when your audience truly lives on that road — but Nairobi commutes cut across CBD arterials, estates, and junctions that no single board can cover. Booking is often tied to multi-week minimums, creative is fixed for the flight, and measurement usually stops at installation photos plus traffic estimates rather than verified plays on your schedule.",
      ),
      paragraph(
        "Admobi taxi-top LED units ride above congestion sight lines and follow corridor traffic. You book corridors and time windows, not a single postcode. GPS-verified proof-of-play shows when and where creatives ran — useful when procurement asks for evidence beyond a site photo.",
      ),
      heading("Radio and television", "h2"),
      paragraph(
        "Broadcast still builds fame and audio recall at scale. The trade-off is audience fragmentation and limited geographic precision: a Nairobi FM buy may wash across counties you do not serve, and TV dayparts are expensive for short tests. There is no route-level log tying a spot to Thika Road versus Westlands.",
      ),
      paragraph(
        "Moving OOH complements broadcast rather than replacing it. Brands often use taxi-top flights to reinforce a radio or digital burst in specific corridors — same week, same message, verifiable outdoor presence where commuters are stuck in traffic.",
      ),
      heading("Print, flyers, and door drops", "h2"),
      paragraph(
        "Print is tangible and trusted for coupons, tariffs, and local language. Production lead times and distribution control vary by vendor; proof is circulation-based, not GPS. Flyers work for hyper-local handoffs but do not scale corridor reach without heavy staffing.",
      ),
      paragraph(
        "Digital OOH on taxis and delivery bikes keeps motion and schedule control: creative can be trafficked centrally, swapped per agreement, and reported like other performance media — without guessing how many leaflets survived the rain.",
      ),
      heading("Social and search (the “new traditional”)", "h2"),
      paragraph(
        "Paid social and search are default for performance marketers. They excel at click and conversion tracking but compete in auction noise; outdoor still delivers unavoidable presence in the physical world. The strongest Nairobi plans pair precision digital with OOH that can be geo- and time-targeted, not just bought as a city-wide package.",
      ),
      heading("Side-by-side: format traits that matter in Nairobi", "h2"),
      paragraph(
        "Static billboards: fixed location, board-level targeting, installation-based proof, often multi-week minimums. Radio/TV: national or regional reach, daypart targeting, ratings-based proof. Print/flyers: tactile, local, circulation-based proof. Admobi taxi-top LED: moves with traffic, corridor and time-window targeting, GPS proof-of-play, flights from one day where inventory allows. Admobi delivery bike enclosures: last-mile estates and lunch corridors, estate-cluster targeting, GPS proof-of-play, typically weekly books.",
      ),
      heading("When to lean on which channel", "h2"),
      paragraph(
        "Use static OOH when you have a landmark message and a board that truly dominates one commute. Use broadcast for audio identity and mass awareness. Use print when physical handoff matters. Use moving LED taxi tops when you need corridor coverage, short test flights, mid-campaign corridor shifts, or procurement-friendly play logs. Use delivery bike enclosures when lunch-hour estates and dispatch routes are the audience.",
      ),
      heading("How to run a short taxi-top test in Nairobi", "h2"),
      paragraph(
        "Share your corridors, dates, and creative format (video or static per the media kit). Admobi confirms inventory, runs creative QA, schedules plays by time window, and delivers GPS proof-of-play summaries after the flight. Indicative taxi-top day bursts start from KES 85,000 for a single corridor where inventory allows — final pricing is confirmed per brief.",
      ),
      paragraph(
        "Ready to compare a moving LED flight against your current OOH line-up? Start a campaign brief and we will model corridors against your goals.",
      ),
    ),
  },
  {
    slug: "planning-nairobi-taxi-top-campaign-corridors",
    title: "How to plan a taxi-top LED campaign by Nairobi corridor",
    excerpt:
      "A practical brief checklist for advertisers: corridors, time windows, creative specs, and what to expect before your first moving LED flight goes live.",
    topic: "campaigns",
    featured: true,
    publishedAt: "2026-06-08T08:00:00.000Z",
    authorName: "Admobi editorial",
    authorRole: "Campaign operations",
    seoTitle: "Plan a Nairobi taxi-top LED campaign by corridor | Admobi Blog",
    seoDescription:
      "Corridor planning, time windows, creative QA, and launch steps for geo-targeted taxi-top LED advertising in Nairobi.",
    cover: {
      alt: "Illustrated cover: Planning a Nairobi taxi-top LED campaign by traffic corridor",
      badge: "CAMPAIGNS",
      headline: ["Plan your Nairobi", "taxi-top flight"],
      subtitle: "Corridors, windows & creative QA",
      filename: "nairobi-corridor-planning-cover.png",
    },
    body: richText(
      paragraph(
        "A taxi-top LED flight works when the corridors match where your audience actually commutes — not when a map pin looks impressive on slide three. This guide walks through what to put in a brief so Admobi can confirm inventory, schedule plays, and deliver GPS proof-of-play without last-minute creative rework.",
      ),
      heading("Start with the outcome, not the format", "h2"),
      paragraph(
        "Are you supporting a product launch, a retail push in specific estates, a political or public-information window, or a always-on brand presence during peak commute? The answer shapes minimum flight length, number of corridors, and whether you pair taxi tops with delivery bike enclosures for lunch-hour estate reach.",
      ),
      heading("Choose corridors that match commute physics", "h2"),
      paragraph(
        "Nairobi campaigns usually cluster around CBD ingress and egress (Mombasa Road, Waiyaki Way, Thika Road, Langata Road), airport and hotel strips, and estate connectors where traffic stalls long enough for a six- to ten-second loop to register. List priority corridors in order; we will flag inventory gaps and suggest adjacent routes rather than over-promising coverage.",
      ),
      paragraph(
        "If your audience is office workers, bias morning and evening peaks. If you are chasing lunch-hour consideration near estates or industrial parks, say so — we may recommend delivery bike enclosures in parallel.",
      ),
      heading("Time windows matter as much as geography", "h2"),
      paragraph(
        "Plays can be weighted to weekday peaks, weekend afternoons, or event-specific days (payday weekends, school terms, holiday travel). Specify start and end dates plus daily windows in EAT. Short test flights — even a single corridor for one day — are viable where inventory allows, which is how many brands de-risk before a multi-week book.",
      ),
      heading("Creative: what to send and when", "h2"),
      paragraph(
        "Follow the media kit for resolution, safe zones, and file formats. LED taxi tops are bright; high-contrast layouts with a single message per loop outperform cluttered frames. Submit final assets early enough for QA: spelling, legibility at distance, and brand guidelines. Revisions after scheduling may shift start dates.",
      ),
      heading("What happens after you submit a brief", "h2"),
      paragraph(
        "We confirm corridor inventory and pricing, run creative QA, traffic the schedule, and monitor the fleet during the flight. After wrap, you receive GPS proof-of-play summaries aligned to your booked windows — useful for finance, agencies, and client reporting.",
      ),
      heading("Brief checklist (copy into your email)", "h2"),
      paragraph(
        "Company and contact; campaign objective; corridors in priority order; flight dates and daily time windows (EAT); creative format (static or video); landing URL or promo code if applicable; billing entity and PO requirements; any brand or category restrictions we should know about.",
      ),
      paragraph(
        "Ready to model a corridor plan? Use the start-campaign flow on admobihq.com or request the media kit for specs and indicative rates.",
      ),
    ),
  },
  {
    slug: "gps-proof-of-play-outdoor-advertising-kenya",
    title: "What GPS proof-of-play means for outdoor advertising in Kenya",
    excerpt:
      "Why installation photos are not enough for procurement — and how route-level play logs make moving LED OOH accountable like digital media.",
    topic: "product",
    featured: false,
    publishedAt: "2026-06-12T10:00:00.000Z",
    authorName: "Admobi editorial",
    authorRole: "Product & operations",
    seoTitle: "GPS proof-of-play for OOH in Kenya | Admobi Blog",
    seoDescription:
      "How GPS-verified proof-of-play works for taxi-top LED and delivery bike OOH — what advertisers, agencies, and finance teams receive after a flight.",
    cover: {
      alt: "Illustrated cover: GPS proof-of-play for outdoor advertising in Kenya",
      badge: "PRODUCT",
      headline: ["GPS proof-of-play", "for Kenyan OOH"],
      subtitle: "Accountability beyond site photos",
      filename: "gps-proof-of-play-cover.png",
    },
    body: richText(
      paragraph(
        "Outdoor has historically been the hardest channel to audit: you pay for a board or a package, receive installation photography, and trust traffic models for the rest. Moving LED on taxis and delivery bikes changes the conversation because plays can be tied to time, route, and device — closer to how digital reports impressions.",
      ),
      heading("Proof-of-play vs proof-of-posting", "h2"),
      paragraph(
        "Proof-of-posting shows that a unit existed and a creative was mounted — important, but silent on whether your ad actually ran on schedule. Proof-of-play confirms that scheduled loops fired while the vehicle was on route during your booked window. For procurement teams under scrutiny, that distinction is the difference between “we bought media” and “we can show delivery.”",
      ),
      heading("What Admobi logs on a typical flight", "h2"),
      paragraph(
        "During a booked window, plays are associated with GPS traces from equipped units. Summaries align to your campaign dates, corridors, and time bands — not a single hero photo at one junction. You still get operational visibility (creative live, QA passed); the log is what you attach when finance asks whether the flight delivered.",
      ),
      heading("Who benefits inside your organisation", "h2"),
      paragraph(
        "Brand managers get confidence to shift budget mid-flight if a corridor under-delivers. Agencies can report to clients without defending modeled reach alone. Finance and procurement get artefacts that resemble digital delivery reports. Legal and compliance teams see timestamped evidence when claims or public-interest messaging must be demonstrable.",
      ),
      heading("Limits to set expectations fairly", "h2"),
      paragraph(
        "GPS proof describes delivery on moving inventory, not individual viewer attention. Weather, traffic incidents, and temporary road closures can reduce impressions on a given day without voiding the entire flight — we work with you on make-goods per contract. Proof complements creative strength; it does not replace it.",
      ),
      heading("How to request proof in your brief", "h2"),
      paragraph(
        "Ask for corridor-level summaries in your preferred format (CSV or PDF) and name the stakeholder who should receive them. If you need weekly splits for a multi-week book, say so up front so reporting is configured before day one.",
      ),
      paragraph(
        "Planning a flight that must stand up to audit? Include proof-of-play requirements in your campaign brief and we will align reporting to your procurement template.",
      ),
    ),
  },
  {
    slug: "delivery-bike-ooh-lunch-hour-estates-nairobi",
    title: "Delivery bike OOH: reaching Nairobi estates at lunch hour",
    excerpt:
      "When taxi-top corridors are not enough — how LED enclosures on delivery bikes put brand messages into estate loops and last-mile routes.",
    topic: "ooh",
    featured: false,
    publishedAt: "2026-06-15T07:30:00.000Z",
    authorName: "Admobi editorial",
    authorRole: "OOH & campaigns",
    seoTitle: "Delivery bike OOH for Nairobi estates | Admobi Blog",
    seoDescription:
      "LED delivery bike enclosures for estate and lunch-hour OOH in Nairobi — audiences, booking rhythm, and how they pair with taxi-top campaigns.",
    cover: {
      alt: "Illustrated cover: Delivery bike OOH for Nairobi estate and lunch-hour reach",
      badge: "OOH",
      headline: ["Delivery bike OOH", "for estate reach"],
      subtitle: "Lunch-hour Nairobi routes",
      filename: "delivery-bike-ooh-cover.png",
    },
    body: richText(
      paragraph(
        "Taxi-top LED excels on arterials where traffic stacks and sight lines are long. But many purchase decisions in Nairobi happen off the highway — estate roads, industrial lunch routes, and the last mile between hub and doorstep. Delivery bike enclosures carry your message into those loops without pretending a CBD board can see them.",
      ),
      heading("Who this format is for", "h2"),
      paragraph(
        "FMCG and QSR brands chasing lunch-hour consideration; telco and fintech promos aimed at estate residents; recruitment and gig-economy platforms visible to riders and pedestrians; political and civic messaging that must show presence at community level. If your brief says “estates” or “dispatch corridors,” bikes may fit better than taxis alone.",
      ),
      heading("How booking differs from taxi tops", "h2"),
      paragraph(
        "Delivery bike books are typically weekly and clustered by estate or dispatch zone rather than a single arterial name. Creative specs differ from taxi tops — check the media kit for enclosure dimensions and brightness. GPS proof-of-play applies the same way: you see delivery on route during booked windows, not just a photo of a mounted panel.",
      ),
      heading("Pairing bikes with taxi tops", "h2"),
      paragraph(
        "Strong Nairobi plans often layer formats: taxis for commute corridors and brand fame, bikes for estate depth during lunch and weekends. One brief can include both; scheduling and reporting stay separated so you can judge each line item on its own merits.",
      ),
      heading("Creative tips for enclosure legibility", "h2"),
      paragraph(
        "Shorter copy, bolder contrast, and one call to action per loop. Remember pedestrians and riders see the panel at close range and shallow angles — fine print that works on a billboard will not survive here.",
      ),
      heading("Next steps", "h2"),
      paragraph(
        "Share estate clusters, weekly dates, and creative assets. We confirm rider inventory, run QA, and deliver play summaries after the flight. Ask for combined modeling if you are also booking taxi-top corridors in the same campaign window.",
      ),
    ),
  },
]

async function createCoverImage(
  filePath: string,
  cover: SeedPost["cover"],
) {
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  const svg = `
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1920" height="1080" fill="#0f0f0f"/>
  <rect x="80" y="80" width="1760" height="920" fill="none" stroke="#2a2a2a" stroke-width="2"/>
  <text x="120" y="200" fill="#a3a3a3" font-family="system-ui, sans-serif" font-size="28" letter-spacing="6">${escapeXml(cover.badge)}</text>
  <text x="120" y="420" fill="#fafafa" font-family="system-ui, sans-serif" font-size="64" font-weight="600">${escapeXml(cover.headline[0])}</text>
  <text x="120" y="510" fill="#fafafa" font-family="system-ui, sans-serif" font-size="64" font-weight="600">${escapeXml(cover.headline[1])}</text>
  <text x="120" y="640" fill="#d4d4d4" font-family="system-ui, sans-serif" font-size="32">${escapeXml(cover.subtitle)}</text>
</svg>`

  await sharp(Buffer.from(svg)).png().toFile(filePath)
}

async function ensureCoverMedia(payload: Payload, cover: SeedPost["cover"]) {
  const existing = await payload.find({
    collection: "media",
    limit: 1,
    where: { alt: { equals: cover.alt } },
  })

  if (existing.docs[0]) {
    return existing.docs[0].id
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "admobi-blog-"))
  const filePath = path.join(tmpDir, cover.filename)
  await createCoverImage(filePath, cover)

  const media = await payload.create({
    collection: "media",
    data: { alt: cover.alt },
    filePath,
  })

  await fs.rm(tmpDir, { recursive: true, force: true })
  return media.id
}

async function findPostBySlug(payload: Payload, slug: string) {
  const result = await payload.find({
    collection: "blog-posts",
    limit: 1,
    where: { slug: { equals: slug } },
  })
  return result.docs[0] ?? null
}

async function upsertPost(payload: Payload, post: SeedPost) {
  const featuredImageId = await ensureCoverMedia(payload, post.cover)

  const postData = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featuredImage: featuredImageId,
    authorName: post.authorName,
    authorRole: post.authorRole,
    publishedAt: post.publishedAt,
    topic: post.topic,
    body: post.body as never,
    featured: post.featured,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
  }

  const existing = await findPostBySlug(payload, post.slug)
  if (existing) {
    await payload.update({
      collection: "blog-posts",
      id: existing.id,
      data: postData,
    })
    console.log(`Blog post (updated): ${post.title}`)
  } else {
    await payload.create({
      collection: "blog-posts",
      draft: false,
      data: postData,
    })
    console.log(`Blog post (published): ${post.title}`)
  }

  console.log(`  → /blog/${post.slug}`)
}

async function seed() {
  if (!process.env.DATABASE_URL?.trim() || !process.env.PAYLOAD_SECRET?.trim()) {
    console.error("Set DATABASE_URL and PAYLOAD_SECRET before seeding.")
    process.exit(1)
  }

  const payload = await getPayloadClient()

  for (const post of SEED_POSTS) {
    await upsertPost(payload, post)
  }

  console.log(`\nSeeded ${SEED_POSTS.length} blog posts.`)
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
