/**
 * Seed help categories and articles into Payload.
 *
 * Usage (from repo root):
 *   npm run seed:help -w web
 *
 * Requires DATABASE_URL and PAYLOAD_SECRET.
 *
 *   npm run seed:help:ci -w web   # CI / env from process (no .env.local file)
 */

import "../lib/load-env.ts"

import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

import type { Payload } from "payload"

import { getPayloadClient } from "@/lib/payload/get-payload"

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

const categories = [
  {
    title: "For advertisers",
    slug: "advertisers",
    description:
      "Campaign setup, creative specs, geo-targeting, and pricing for taxi-top OOH in Nairobi.",
    audience: "advertiser" as const,
    sortOrder: 1,
  },
  {
    title: "For drivers",
    slug: "drivers",
    description:
      "Signup, payouts, hardware, and day-to-day questions for Admobi driver partners.",
    audience: "driver" as const,
    sortOrder: 2,
  },
  {
    title: "For fleet partners",
    slug: "fleet-partners",
    description:
      "Partnership models, installation, revenue share, and multi-city rollout.",
    audience: "fleet" as const,
    sortOrder: 3,
  },
  {
    title: "General",
    slug: "general",
    description: "Nairobi coverage, Kenya rollout roadmap, and network overview.",
    audience: "general" as const,
    sortOrder: 4,
  },
]

async function findBySlug(payload: Payload, collection: "help-categories" | "help-articles", slug: string) {
  const result = await payload.find({
    collection,
    limit: 1,
    where: { slug: { equals: slug } },
  })
  return result.docs[0] ?? null
}

async function seed() {
  if (!process.env.DATABASE_URL?.trim() || !process.env.PAYLOAD_SECRET?.trim()) {
    console.error("Set DATABASE_URL and PAYLOAD_SECRET before seeding.")
    process.exit(1)
  }

  const payload = await getPayloadClient()
  const categoryIds: Record<string, number> = {}

  for (const category of categories) {
    const existing = await findBySlug(payload, "help-categories", category.slug)
    const doc =
      existing ??
      (await payload.create({
        collection: "help-categories",
        data: category,
      }))
    categoryIds[category.slug] = Number(doc.id)
    console.log(`${existing ? "Category (exists)" : "Category"}: ${category.title}`)
  }

  const articles = [
    {
      title: "What creative formats does Admobi accept?",
      slug: "creative-formats",
      categorySlug: "advertisers",
      excerpt:
        "Video and static packages sized to the unit spec. Loop length, safe zones, and codecs are listed in the media kit.",
      body: richText(
        paragraph(
          "Admobi accepts video and static creative packages sized to the taxi-top or delivery bike unit spec. Loop length, safe zones, and supported codecs are documented in the media kit.",
        ),
        heading("Creative checklist", "h2"),
        paragraph(
          "Before trafficking, confirm dimensions, safe zones, maximum loop length, and codec requirements with your Admobi contact or the published media kit.",
        ),
      ),
      sortOrder: 1,
      featured: true,
    },
    {
      title: "How quickly can we launch a taxi-top campaign in Nairobi?",
      slug: "launch-timeline",
      categorySlug: "advertisers",
      excerpt:
        "Short flights are possible when inventory and compliance checks line up. Contact Admobi with your brief for a timeline.",
      body: richText(
        paragraph(
          "Launch timing depends on creative readiness, corridor availability, and compliance checks. Short flights are possible when inventory and approvals align.",
        ),
        paragraph(
          "Share your brief via the start-campaign form for a concrete timeline and availability check.",
        ),
      ),
      sortOrder: 2,
      featured: true,
    },
    {
      title: "Which Nairobi corridors can we target?",
      slug: "nairobi-corridors",
      categorySlug: "advertisers",
      excerpt:
        "Corridor books follow live fleet density. Your brief names neighbourhoods, arterials, or venues.",
      body: richText(
        paragraph(
          "Corridor availability follows live fleet density. Name neighbourhoods, arterials, or venues in your brief and Admobi confirms what can run in your flight window.",
        ),
      ),
      sortOrder: 3,
      featured: false,
    },
    {
      title: "How do driver payouts work?",
      slug: "driver-payouts",
      categorySlug: "drivers",
      excerpt:
        "Drivers earn from verified screen hours. Payout schedules are shared during onboarding.",
      body: richText(
        paragraph(
          "Drivers earn from verified screen hours tracked on the unit. Payout schedules and thresholds are explained during onboarding once your application is approved.",
        ),
      ),
      sortOrder: 1,
      featured: true,
    },
    {
      title: "Do drivers manage ad content?",
      slug: "driver-content-management",
      categorySlug: "drivers",
      excerpt: "No. Admobi schedules and reviews all creative centrally.",
      body: richText(
        paragraph(
          "No. Screens run automatically during normal driving hours. Admobi schedules, reviews, and plays all creative, you do not manage ads on the unit.",
        ),
      ),
      sortOrder: 2,
      featured: false,
    },
    {
      title: "Do fleet partners buy the hardware?",
      slug: "fleet-hardware-cost",
      categorySlug: "fleet-partners",
      excerpt:
        "No. Admobi funds purchase, install, and replacement for covered faults. Revenue comes from the partnership model.",
      body: richText(
        paragraph(
          "No. Admobi funds purchase, installation, and replacement for covered faults. Your commercial upside is in the partnership revenue model, not capex on screens.",
        ),
      ),
      sortOrder: 1,
      featured: false,
    },
    {
      title: "How fast can we expand to a second city?",
      slug: "fleet-second-city",
      categorySlug: "fleet-partners",
      excerpt:
        "Nakuru, Eldoret, and Mombasa follow Nairobi in the rollout plan when inventory and compliance align.",
      body: richText(
        paragraph(
          "Once Nairobi density is healthy, Nakuru, Eldoret, and Mombasa follow in the Kenya rollout plan. Multi-city books are scheduled when inventory and compliance line up.",
        ),
      ),
      sortOrder: 2,
      featured: false,
    },
    {
      title: "Who handles driver complaints about ads?",
      slug: "fleet-driver-complaints",
      categorySlug: "fleet-partners",
      excerpt: "Escalate to Admobi operations. We can pause units for brand-safety issues.",
      body: richText(
        paragraph(
          "Escalate to Admobi operations. We triage brand-safety flags and can pause units if a creative breaches your comfort settings.",
        ),
      ),
      sortOrder: 3,
      featured: false,
    },
    {
      title: "What if vehicles sit idle during low season?",
      slug: "fleet-idle-vehicles",
      categorySlug: "fleet-partners",
      excerpt: "Contracts define how idle time affects revenue before sign-off.",
      body: richText(
        paragraph(
          "Contracts define how idle time affects revenue. Your partnership manager models realistic utilisation before sign-off so expectations stay clear.",
        ),
      ),
      sortOrder: 4,
      featured: false,
    },
    {
      title: "Where does Admobi operate today?",
      slug: "coverage-nairobi",
      categorySlug: "general",
      excerpt: "Nairobi is the production footprint. Additional Kenyan cities follow the rollout plan.",
      body: richText(
        paragraph(
          "Admobi's production network is Nairobi-first. Nakuru, Eldoret, and Mombasa are on the Kenya rollout roadmap as fleet density and compliance allow.",
        ),
      ),
      sortOrder: 1,
      featured: true,
    },
  ]

  for (const article of articles) {
    const categoryId = categoryIds[article.categorySlug]
    if (!categoryId) {
      throw new Error(`Missing category for slug: ${article.categorySlug}`)
    }

    const articleData = {
      title: article.title,
      slug: article.slug,
      category: categoryId,
      excerpt: article.excerpt,
      body: article.body as never,
      sortOrder: article.sortOrder,
      featured: article.featured,
    }

    const existingArticle = await findBySlug(payload, "help-articles", article.slug)
    if (existingArticle) {
      await payload.update({
        collection: "help-articles",
        id: existingArticle.id,
        data: articleData,
        draft: false,
      })
      console.log(`Article (updated & published): ${article.title}`)
    } else {
      await payload.create({
        collection: "help-articles",
        draft: false,
        data: articleData,
      })
      console.log(`Article: ${article.title}`)
    }
  }

  console.log(`Seeded ${categories.length} categories and ${articles.length} articles.`)
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
