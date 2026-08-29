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
    direction: "ltr" as const,
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
    direction: "ltr" as const,
    format: "",
    indent: 0,
    textFormat: 0,
    version: 1,
  }
}

function bulletList(items: string[]) {
  return {
    type: "list",
    listType: "bullet",
    tag: "ul",
    start: 1,
    direction: "ltr" as const,
    format: "",
    indent: 0,
    version: 1,
    children: items.map((item, index) => ({
      type: "listitem",
      value: index + 1,
      children: [textNode(item)],
      direction: "ltr" as const,
      format: "",
      indent: 0,
      version: 1,
    })),
  }
}

function tableCell(text: string, header = false) {
  return {
    type: "tablecell",
    headerState: header ? 1 : 0,
    colSpan: 1,
    rowSpan: 1,
    backgroundColor: null,
    children: [paragraph(text)],
    direction: "ltr" as const,
    format: "",
    indent: 0,
    version: 1,
  }
}

function table(headers: string[], rows: string[][]) {
  return {
    type: "table",
    direction: "ltr" as const,
    format: "",
    indent: 0,
    version: 1,
    children: [
      {
        type: "tablerow",
        direction: "ltr" as const,
        format: "",
        indent: 0,
        version: 1,
        children: headers.map((header) => tableCell(header, true)),
      },
      ...rows.map((row) => ({
        type: "tablerow",
        direction: "ltr" as const,
        format: "",
        indent: 0,
        version: 1,
        children: row.map((cell) => tableCell(cell)),
      })),
    ],
  }
}

type BodyBlock =
  | ReturnType<typeof paragraph>
  | ReturnType<typeof heading>
  | ReturnType<typeof bulletList>
  | ReturnType<typeof table>

function richText(...blocks: BodyBlock[]): SerializedEditorState {
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
    title: "Creative specs",
    slug: "creative-specs",
    legacySlugs: ["advertisers"],
    description: "Formats, codecs, loop length, and how creative is reviewed before it plays.",
    audience: "advertiser" as const,
    sortOrder: 1,
  },
  {
    title: "Booking and flights",
    slug: "booking-flights",
    description: "Briefs, launch timing, corridors, and dayparts for Nairobi taxi-top campaigns.",
    audience: "advertiser" as const,
    sortOrder: 2,
  },
  {
    title: "Proof of play and pricing",
    slug: "proof-pricing",
    description: "GPS logs, reporting, minimums, and how spend is confirmed.",
    audience: "advertiser" as const,
    sortOrder: 3,
  },
  {
    title: "Getting started",
    slug: "driver-getting-started",
    description: "Signup, onboarding, and what you do (and do not do) once the unit is live.",
    audience: "driver" as const,
    sortOrder: 4,
  },
  {
    title: "Payouts",
    slug: "payouts",
    legacySlugs: ["drivers"],
    description: "Verified screen hours, payout rhythm, and how to read a monthly summary.",
    audience: "driver" as const,
    sortOrder: 5,
  },
  {
    title: "Hardware and the unit",
    slug: "driver-hardware",
    description: "Damage, wear, and who may remove or service the screen.",
    audience: "driver" as const,
    sortOrder: 6,
  },
  {
    title: "Partnership",
    slug: "fleet-partnership",
    legacySlugs: ["fleet-partners"],
    description: "Revenue model, hardware funding, idle time, and driver complaints.",
    audience: "fleet" as const,
    sortOrder: 7,
  },
  {
    title: "Installation and rollout",
    slug: "fleet-install",
    description: "Install windows, go-live, and second-city expansion in Kenya.",
    audience: "fleet" as const,
    sortOrder: 8,
  },
  {
    title: "Coverage and Kenya",
    slug: "coverage-kenya",
    legacySlugs: ["general"],
    description: "Where the network runs today and how additional cities join.",
    audience: "general" as const,
    sortOrder: 9,
  },
]

const articles = [
  {
    title: "What creative formats does Admobi accept?",
    slug: "creative-formats",
    categorySlug: "creative-specs",
    excerpt:
      "Video and static packages sized to the unit spec. Loop length, safe zones, and codecs are listed below and in the media kit.",
    featured: true,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Admobi accepts video and static creative sized to the taxi-top or delivery bike unit. Use only packages that match the table. If a file is close but not exact, we will flag it before the flight rather than crop live.",
      ),
      heading("Accepted packages", "h2"),
      table(
        ["Package", "Typical use", "Notes"],
        [
          ["Video loop", "Taxi-top LED", "Preferred for motion-led OOH"],
          ["Static frame", "Hold or fallback", "Use when video is not ready"],
          ["Bike enclosure still", "Delivery routes", "Sized to the enclosure spec, not the taxi top"],
        ],
      ),
      heading("Codecs, length, and safe zones", "h2"),
      table(
        ["Spec", "Taxi-top LED", "Delivery bike enclosure"],
        [
          ["Preferred codecs", "H.264 MP4, high-quality still PNG or JPG", "Same codecs, smaller canvas"],
          ["Loop length", "Confirm in the media kit; keep under the listed max", "Shorter loops; estate dwell is brief"],
          ["Safe zone", "Keep logos and legal inside the inner frame", "Keep type large; viewing distance is short"],
          ["Audio", "Not used on street units", "Not used"],
        ],
      ),
      heading("Creative checklist", "h2"),
      bulletList([
        "Confirm canvas size against the current media kit, not a previous flight.",
        "Keep contact details and URLs inside the safe zone.",
        "Avoid thin type; Nairobi daylight and motion punish hairlines.",
        "Send a master plus a flattened review copy so ops can spot-check on a phone.",
      ]),
      paragraph(
        "Before trafficking, confirm dimensions, maximum loop length, and codec requirements with your Admobi contact if anything in the kit has changed.",
      ),
    ),
  },
  {
    title: "How is creative reviewed before it plays?",
    slug: "creative-review",
    categorySlug: "creative-specs",
    excerpt:
      "Admobi schedules and reviews all creative centrally. Drivers do not load ads. Brand-safety flags can pause a unit.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "Screens run a centrally scheduled playlist. Partners and drivers do not load files onto the unit. Review happens before the first play and again if a complaint is raised.",
      ),
      heading("What we check", "h2"),
      bulletList([
        "Format and codec against the spec table.",
        "Brand-safety and local advertising rules.",
        "Legibility at typical viewing distances on Nairobi arterials.",
      ]),
      heading("If something is rejected", "h2"),
      paragraph(
        "You get a short note on what to fix. A replacement file in the same spec can usually replace the loop without rebuilding the whole flight, as long as inventory is still held.",
      ),
    ),
  },
  {
    title: "How quickly can we launch a taxi-top campaign in Nairobi?",
    slug: "launch-timeline",
    categorySlug: "booking-flights",
    excerpt:
      "Short flights are possible when inventory, creative, and compliance line up. Share a brief for a dated window.",
    featured: true,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Launch timing depends on creative readiness, corridor availability, and compliance checks. Short flights are possible when those three line up. A vague brief without dates or neighbourhoods cannot be scheduled.",
      ),
      heading("Typical path from brief to first play", "h2"),
      table(
        ["Stage", "What you send", "What Admobi confirms"],
        [
          ["Brief", "Neighbourhoods, dates, audience, budget band", "Whether inventory can hold"],
          ["Creative", "Master files in spec", "Review pass or rejection notes"],
          ["Hold", "Signed commercial terms", "Corridor and daypart hold"],
          ["Go-live", "Final trafficked package", "First verified plays on the GPS log"],
        ],
      ),
      heading("How to speed it up", "h2"),
      paragraph(
        "Send creative with the brief, name real corridors (Thika Road, Waiyaki Way, Mombasa Road, not only “Nairobi”), and keep legal copy ready. Share the brief via the start-campaign form for a concrete window.",
      ),
    ),
  },
  {
    title: "What should go in a campaign brief?",
    slug: "booking-brief",
    categorySlug: "booking-flights",
    excerpt:
      "Neighbourhoods, flight dates, audience, and creative status. The more specific the corridor list, the faster the hold.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "A usable brief names where people actually move, not a pin that looks good on a slide. Admobi confirms inventory against live fleet density in that window.",
      ),
      heading("Include these", "h2"),
      bulletList([
        "Target neighbourhoods, arterials, or venues.",
        "Preferred dates and whether weekends matter.",
        "Audience: office commuters, estate lunch hour, evening retail, or mixed.",
        "Creative status: ready, in design, or needs a spec check.",
        "Budget band or the question you need priced.",
      ]),
      heading("Helpful extras", "h2"),
      paragraph(
        "If your audience is office workers, bias morning and evening peaks. If you are chasing lunch-hour consideration near estates or industrial parks, say so; delivery bike enclosures may be the better pair.",
      ),
    ),
  },
  {
    title: "Which Nairobi corridors can we target?",
    slug: "nairobi-corridors",
    categorySlug: "booking-flights",
    excerpt:
      "Corridor books follow live fleet density. Name neighbourhoods, arterials, or venues in the brief.",
    featured: false,
    sortOrder: 3,
    body: richText(
      paragraph(
        "Availability follows live fleet density, not a static map of every road. Name the places that matter; Admobi confirms what can run in your flight window.",
      ),
      heading("Example corridors and when they fit", "h2"),
      table(
        ["Corridor or area", "Often useful for", "Watch-out"],
        [
          ["CBD and surrounding arterials", "Broad Nairobi awareness", "Peak congestion; loops must read fast"],
          ["Thika Road", "North-east commute and retail", "Density shifts with time of day"],
          ["Waiyaki Way / Westlands", "Office and evening retail", "Confirm weekend vs weekday hold"],
          ["Mombasa Road", "Airport and industrial traffic", "Not a substitute for estate lunch hour"],
          ["Estates and dispatch routes", "Lunch-hour consideration", "Often paired with bike enclosures"],
        ],
      ),
      paragraph(
        "This table is a planning aid, not a live inventory sheet. Your hold is confirmed against fleet on the dates you asked for.",
      ),
    ),
  },
  {
    title: "How do dayparts and play windows work?",
    slug: "dayparts-and-windows",
    categorySlug: "booking-flights",
    excerpt:
      "You book time windows and corridors, not a single postcode. Plays follow the taxi, logged against GPS.",
    featured: false,
    sortOrder: 4,
    body: richText(
      paragraph(
        "Geo-targeted OOH on moving taxis is a corridor and a clock, not a billboard lease. Partner taxis carry connected screens; plays are logged against GPS routes.",
      ),
      heading("How to brief windows", "h2"),
      bulletList([
        "Morning peak if the audience is inbound office traffic.",
        "Evening peak for outbound commute and retail.",
        "Midday if estates, industrial parks, or lunch consideration matter.",
      ]),
      paragraph(
        "If you need both taxi tops and delivery bike enclosures, say so in the brief so ops does not treat them as one canvas.",
      ),
    ),
  },
  {
    title: "How does proof of play work?",
    slug: "proof-of-play",
    categorySlug: "proof-pricing",
    excerpt:
      "Verified plays are logged against GPS routes and schedule, not installation photos alone.",
    featured: true,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Reporting shows where and when creatives actually ran across Nairobi, tied to the schedule you booked. That is the difference from a static board photo plus a traffic estimate.",
      ),
      heading("What a log typically includes", "h2"),
      table(
        ["Field", "Why it matters"],
        [
          ["Time window", "Confirms the daypart you paid for"],
          ["Route or corridor context", "Shows the taxi was in the booked area"],
          ["Creative identifier", "Ties the play to the trafficked file"],
          ["Play or hour count", "Supports invoice and optimisation talk"],
        ],
      ),
      heading("What it is not", "h2"),
      paragraph(
        "Proof of play is not a guaranteed number of unique people. It is a verified record of the network doing the thing you booked. Use it in procurement packs alongside your own brand metrics.",
      ),
    ),
  },
  {
    title: "What is the minimum spend or campaign duration?",
    slug: "pricing-and-minimums",
    categorySlug: "proof-pricing",
    excerpt:
      "Campaigns can start from a single day where inventory allows. Final pricing is confirmed with your brief.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "There is no single public rate card that fits every corridor and month. Minimums follow inventory: a one-day test is possible when units are free; a dense CBD hold in a busy week is not.",
      ),
      heading("How pricing is confirmed", "h2"),
      bulletList([
        "You send dates, corridors, and a budget band.",
        "Admobi returns what can be held and at what commercial terms.",
        "Creative that misses spec can delay go-live without changing the hold logic.",
      ]),
      paragraph(
        "Use the start-campaign form or your account contact. Do not treat a past flight’s number as the next one.",
      ),
    ),
  },
  {
    title: "How do I join as a driver?",
    slug: "driver-signup",
    categorySlug: "driver-getting-started",
    excerpt:
      "Apply through Admobi. Installation, hardware, and maintenance are free. You do not buy the screen.",
    featured: true,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Driver partners carry a connected screen on an approved vehicle. You do not pay to join. Installation, hardware, and covered maintenance are on Admobi.",
      ),
      heading("What happens after you apply", "h2"),
      bulletList([
        "Ops checks vehicle and route fit.",
        "A technician installs the unit; you do not self-install.",
        "Onboarding covers payouts, damage reporting, and what the screen does on its own.",
      ]),
      heading("What you do day to day", "h2"),
      paragraph(
        "Drive as usual during the hours the unit is meant to run. You do not pick ads, load files, or change the playlist. If the unit looks wrong, report it; do not open it.",
      ),
    ),
  },
  {
    title: "Do drivers manage ad content?",
    slug: "driver-content-management",
    categorySlug: "driver-getting-started",
    excerpt: "No. Admobi schedules and reviews all creative centrally.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "No. Screens run automatically during normal driving hours. Admobi schedules, reviews, and plays all creative. You do not manage ads on the unit.",
      ),
      heading("If a passenger or owner complains about an ad", "h2"),
      paragraph(
        "Do not try to skip or delete it. Report the complaint to Admobi operations. Units can be paused when a creative fails brand-safety or comfort settings.",
      ),
    ),
  },
  {
    title: "How do I track earnings before payout?",
    slug: "driver-earnings-track",
    categorySlug: "driver-getting-started",
    excerpt:
      "A monthly summary is sent by SMS and WhatsApp while the driver portal is being built.",
    featured: false,
    sortOrder: 3,
    body: richText(
      paragraph(
        "Earnings come from verified screen hours, not from guessing traffic. Until the driver portal is live, the monthly summary is the record to keep.",
      ),
      heading("If a summary looks wrong", "h2"),
      paragraph(
        "Write to support with the month, the vehicle, and what you expected. Do not wait until the next cycle if hours look short after a week of downtime.",
      ),
    ),
  },
  {
    title: "How do driver payouts work?",
    slug: "driver-payouts",
    categorySlug: "payouts",
    excerpt:
      "Drivers earn from verified screen hours. Payout schedules and thresholds are explained at onboarding.",
    featured: true,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Drivers earn from verified screen hours tracked on the unit. The commercial details (threshold, method, and calendar) are set during onboarding so they match the partnership you joined.",
      ),
      heading("What is tracked versus when it pays", "h2"),
      table(
        ["Item", "What it means"],
        [
          ["Verified screen hours", "The unit was on, reporting, and in the expected operating window"],
          ["Unverified or down time", "Does not count toward the period until the unit is healthy again"],
          ["Monthly summary", "SMS and WhatsApp recap of the period while the portal is in progress"],
          ["Payout", "Sent on the schedule explained at onboarding, after the summary window"],
        ],
      ),
      heading("If payout is late", "h2"),
      paragraph(
        "Check the summary first. If hours look right and the date has passed, contact support with the month and the number used for payout. Do not remove the unit yourself while a case is open.",
      ),
    ),
  },
  {
    title: "What if the screen is damaged?",
    slug: "driver-hardware-damage",
    categorySlug: "driver-hardware",
    excerpt:
      "Report it. Accident damage is reviewed case by case. Fair wear and tear is covered by Admobi.",
    featured: false,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Report damage as soon as it is safe to do so. Do not keep driving a unit that is hanging loose or sparking. Fair wear is covered; accident and third-party damage is reviewed against the onboarding terms.",
      ),
      heading("What to send", "h2"),
      bulletList([
        "When it happened and where you were.",
        "A photo of the unit and the mount, if you can take one safely.",
        "Whether the vehicle was in a collision or only the screen was hit.",
      ]),
      paragraph(
        "Ops will tell you whether to visit a technician or wait for a mobile visit. Do not improvise a repair with tape or a garage that is not appointed.",
      ),
    ),
  },
  {
    title: "Can I remove the screen myself?",
    slug: "driver-screen-removal",
    categorySlug: "driver-hardware",
    excerpt:
      "No. Removal must be done by an Admobi technician so the vehicle and unit stay intact.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "No. Self-removal risks the roof, wiring, and the unit. Contact Admobi and a technician will schedule removal or transfer.",
      ),
      heading("When you leave the programme", "h2"),
      paragraph(
        "Request a removal slot. Do not sell or gift the screen. Hardware stays Admobi property unless a written agreement says otherwise.",
      ),
    ),
  },
  {
    title: "Do fleet partners buy the hardware?",
    slug: "fleet-hardware-cost",
    categorySlug: "fleet-partnership",
    excerpt:
      "No. Admobi funds purchase, install, and replacement for covered faults. Upside is the revenue model, not capex.",
    featured: false,
    sortOrder: 1,
    body: richText(
      paragraph(
        "No. Admobi funds purchase, installation, and replacement for covered faults. Your commercial upside is in the partnership revenue model, not capex on screens.",
      ),
      heading("What you still own operationally", "h2"),
      bulletList([
        "Driver communication so units are not treated as optional roof cargo.",
        "Access for install and service windows.",
        "Escalation when a driver or owner wants a unit paused.",
      ]),
    ),
  },
  {
    title: "How does the fleet partnership model work?",
    slug: "fleet-partnership-model",
    categorySlug: "fleet-partnership",
    excerpt:
      "Revenue share against verified network hours, with utilisation modelled before sign-off.",
    featured: true,
    sortOrder: 2,
    body: richText(
      paragraph(
        "The partnership is not a hardware sale. Admobi funds units; the fleet supplies vehicles and access; both sides share in verified operating time according to the contract.",
      ),
      heading("Before you sign", "h2"),
      paragraph(
        "A partnership manager models realistic utilisation, including idle seasons, so the revenue line is not a best-day fantasy. Ask for that model in writing.",
      ),
      heading("During the term", "h2"),
      bulletList([
        "Keep install and service access.",
        "Escalate brand-safety or driver comfort issues to ops, not to the driver to “fix the ad”.",
        "Plan second-city density only when Nairobi (or the live city) is actually healthy.",
      ]),
    ),
  },
  {
    title: "Who handles driver complaints about ads?",
    slug: "fleet-driver-complaints",
    categorySlug: "fleet-partnership",
    excerpt: "Escalate to Admobi operations. We can pause units for brand-safety issues.",
    featured: false,
    sortOrder: 3,
    body: richText(
      paragraph(
        "Escalate to Admobi operations. We triage brand-safety flags and can pause units if a creative breaches your comfort settings.",
      ),
      heading("What to include", "h2"),
      paragraph(
        "Vehicle identifier, time of the complaint, and a description of the creative if the driver remembers it. A photo of the screen helps if it is safe to take one while parked.",
      ),
    ),
  },
  {
    title: "What if vehicles sit idle during low season?",
    slug: "fleet-idle-vehicles",
    categorySlug: "fleet-partnership",
    excerpt: "Contracts define how idle time affects revenue before sign-off.",
    featured: false,
    sortOrder: 4,
    body: richText(
      paragraph(
        "Contracts define how idle time affects revenue. Your partnership manager models realistic utilisation before sign-off so expectations stay clear.",
      ),
      heading("What not to do", "h2"),
      paragraph(
        "Do not remove units for a quiet month without a technician. Idle hardware that is still installed is easier to bring back than a self-removal and a later reinstall.",
      ),
    ),
  },
  {
    title: "What does install to go-live look like?",
    slug: "fleet-install-timeline",
    categorySlug: "fleet-install",
    excerpt:
      "Survey, install slot, network check, then first verified plays. Access windows decide the calendar more than hardware lead time.",
    featured: false,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Hardware is funded and staged by Admobi. The scarce resource is usually a vehicle that can sit for a technician, not the screen itself.",
      ),
      heading("Install to first play", "h2"),
      table(
        ["Step", "Whose action", "Typical blocker"],
        [
          ["Site or vehicle survey", "Admobi + fleet", "Vehicle not available that day"],
          ["Install slot", "Technician", "Yard access or driver no-show"],
          ["Network and power check", "Admobi", "Unit not reporting"],
          ["Go-live", "Admobi ops", "Creative or campaign hold not ready (advertiser side)"],
        ],
      ),
      paragraph(
        "Batch installs work when the fleet can stage several vehicles. One-off installs slip when the only available car is on a trip.",
      ),
    ),
  },
  {
    title: "How fast can we expand to a second city?",
    slug: "fleet-second-city",
    categorySlug: "fleet-install",
    excerpt:
      "Nakuru, Eldoret, and Mombasa follow Nairobi in the rollout plan when inventory and compliance align.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "Once Nairobi density is healthy, Nakuru, Eldoret, and Mombasa follow in the Kenya rollout plan. Multi-city books are scheduled when inventory and compliance line up.",
      ),
      heading("What “ready” means", "h2"),
      bulletList([
        "Enough live units in the first city to learn operations.",
        "A local fleet partner who can give install access.",
        "Advertiser demand that is not only a slide mentioning the city name.",
      ]),
    ),
  },
  {
    title: "Where does Admobi operate today?",
    slug: "coverage-nairobi",
    categorySlug: "coverage-kenya",
    excerpt: "Nairobi is the production footprint. Additional Kenyan cities follow the rollout plan.",
    featured: true,
    sortOrder: 1,
    body: richText(
      paragraph(
        "Admobi’s production network is Nairobi-first. Taxi-top LED and delivery bike enclosures run where partner density supports a bookable flight.",
      ),
      heading("What “Nairobi” means for a brief", "h2"),
      paragraph(
        "It does not mean every estate on the same day. It means you can name corridors and dayparts inside the city and get a hold against live fleet. Counties outside Nairobi are not a production footprint yet.",
      ),
    ),
  },
  {
    title: "Which Kenyan cities are next?",
    slug: "kenya-rollout",
    categorySlug: "coverage-kenya",
    excerpt:
      "Nakuru, Eldoret, and Mombasa are on the roadmap as fleet density and compliance allow.",
    featured: false,
    sortOrder: 2,
    body: richText(
      paragraph(
        "Nakuru, Eldoret, and Mombasa are next on the rollout roadmap. Dates move with partner density and compliance, not with a marketing calendar alone.",
      ),
      heading("If you need a city that is not live", "h2"),
      paragraph(
        "Say so in the brief. Ops can tell you whether a test is realistic or whether you should plan Nairobi now and a second city when the network is actually there.",
      ),
    ),
  },
]

async function findBySlug(
  payload: Payload,
  collection: "help-categories" | "help-articles",
  slug: string,
) {
  const result = await payload.find({
    collection,
    limit: 1,
    draft: true,
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
    const slugsToFind = [category.slug, ...(category.legacySlugs ?? [])]
    let existing = null
    for (const slug of slugsToFind) {
      existing = await findBySlug(payload, "help-categories", slug)
      if (existing) {
        break
      }
    }

    const data = {
      title: category.title,
      slug: category.slug,
      description: category.description,
      audience: category.audience,
      sortOrder: category.sortOrder,
    }

    const doc = existing
      ? await payload.update({
          collection: "help-categories",
          id: existing.id,
          data,
        })
      : await payload.create({
          collection: "help-categories",
          data,
        })

    categoryIds[category.slug] = Number(doc.id)
    console.log(`${existing ? "Category (updated)" : "Category"}: ${category.title}`)
  }

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
      _status: "published" as const,
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
