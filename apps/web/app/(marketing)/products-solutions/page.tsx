import { Plus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import {
  CREATIVE_FORMATS_LABEL,
  CREATIVE_SPECS,
  MAX_CREATIVE_BYTES,
  bikeSidesOptions,
  marketZoneIds,
  slotLengthOptions,
} from "@workspace/ops-contracts"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Container } from "@/components/landing/container"
import { LIVE_CITY, nextCitiesList } from "@/components/landing/rollout"
import { LastUpdated } from "@/components/seo/last-updated"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { OohComparisonTable } from "@/components/seo/ooh-comparison-table"
import { productsFaqItems } from "@/lib/seo/faq-data"
import { pageMetadata } from "@/lib/seo/site"

import { BikeSides, CreativeExample, TargetingScreens, TaxiLoop } from "./screens"

export const metadata = pageMetadata({
  title: "Digital OOH products | taxi tops & delivery bikes | Admobi Kenya",
  description:
    "Run geo-targeted taxi-top LED and delivery bike advertising in Nairobi. Geo-aware scheduling, proof-of-play, and flexible flights from one day. Admobi Kenya.",
  path: "/products-solutions",
})

const list = (items: readonly string[], type: Intl.ListFormatType = "conjunction") =>
  new Intl.ListFormat("en", { type }).format(items)

const taxi = CREATIVE_SPECS.taxi_top
const bike = CREATIVE_SPECS.delivery_bike
const maxMb = MAX_CREATIVE_BYTES / 1024 / 1024
const markets = list(Object.keys(marketZoneIds))

/** Fixed colours for bands that sit on a photograph or a dark band in both themes, so they can't use theme tokens. */
const ON_PHOTO = "text-[oklch(0.985_0.008_82)]"
const NIGHT = "bg-[oklch(0.25_0.022_262)]"

/** This page's own last change (the site-wide SEO_LAST_UPDATED is older). */
const PAGE_UPDATED = "2026-10-26"

const H2 = "text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
/** The two product names carry their sections, so they step up a size. */
const H2_PRODUCT = "text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl"

const steps = [
  {
    title: "Pick a format, areas and times",
    body: `Taxi tops, bike boxes or both. Choose from ${markets}, then the hours you want to run.`,
  },
  {
    title: "Send your creative",
    body: `One file per screen shape: ${taxi.aspectLabel} for taxi tops, ${bike.aspectLabel} for bike boxes. Up to six files per campaign, or we can make them for you.`,
  },
  {
    title: "We check it and go live",
    body: "Our ops team reviews shape, readability at street distance and safe zones before the first play.",
  },
  {
    title: "Get your proof-of-play report",
    body: "Every play is logged against the vehicle's GPS, so you see where and when your ad ran.",
  },
] as const

/** Illustrative rows for the sample report; labelled as a sample on the page. */
const samplePlays = [
  { time: "12:04", road: "Waiyaki Way", area: "Westlands", screen: "Taxi 0142" },
  { time: "12:11", road: "Woodvale Grove", area: "Westlands", screen: "Taxi 0087" },
  { time: "12:19", road: "Ring Road Parklands", area: "Westlands", screen: "Taxi 0142" },
  { time: "12:26", road: "Lower Kabete Road", area: "Westlands", screen: "Taxi 0203" },
  { time: "12:33", road: "Waiyaki Way", area: "Westlands", screen: "Taxi 0087" },
] as const

export default function ProductsSolutionsPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/products-solutions"
        name="Digital OOH products | taxi tops & delivery bikes | Admobi Kenya"
        description="Run geo-targeted taxi-top LED and delivery bike advertising in Nairobi with proof-of-play and flexible flights."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Products & solutions", path: "/products-solutions" },
        ]}
        faqItems={productsFaqItems}
        dateModified={PAGE_UPDATED}
      />

      {/* Scroll morph: the full-bleed hero pins under the header, then shrinks into an inset,
          rounded card (the footer's inset and radius). Styles: .hero-morph in packages/ui globals.css. */}
      <section className="hero-morph">
        <div className="hero-frame relative isolate flex min-h-[min(calc(100dvh-4rem),50rem)] items-end overflow-hidden xl:min-h-[min(calc(100dvh-5rem),50rem)]">
          <div className="hero-photo absolute inset-0 -z-20">
            <Image
              src="/products/nairobi-cbd.jpg"
              alt="Matatus, cars and boda bodas on a Nairobi CBD street under jacaranda trees"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_60%]"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,oklch(0.18_0.02_262/0.94),oklch(0.18_0.02_262/0.8)_55%,oklch(0.18_0.02_262/0.45)_80%,oklch(0.18_0.02_262/0.2))] lg:bg-[linear-gradient(to_right,oklch(0.18_0.02_262/0.92),oklch(0.18_0.02_262/0.78)_55%,oklch(0.18_0.02_262/0.25)_85%,transparent)]"
          />
          <Container className={`px-6 pt-24 pb-10 sm:pb-16 lg:pb-20 ${ON_PHOTO}`}>
            <div className="max-w-3xl">
              <p className="text-[0.7rem] font-medium tracking-[0.2em] uppercase opacity-75 sm:text-xs">
                Products &amp; solutions · Kenya rollout
              </p>
              <h1 className="mt-4 text-3xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem]">
                Digital OOH advertising in Kenya, taxi tops and delivery bikes
              </h1>
              <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-pretty opacity-90 sm:text-lg">
                Admobi is Kenya&apos;s digital out-of-home network for brands that need motion-led
                outdoor advertising in Nairobi and beyond. Taxi-top LED screens and delivery bike
                enclosures bring geo-aware scheduling and proof-of-play to a format that moves with
                your audience instead of waiting for them.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild size="lg" className="active:scale-[0.98]">
                  <Link href="/start-campaign">Start a campaign</Link>
                </Button>
                <Link
                  href="/pricing"
                  className="text-sm font-medium underline decoration-current/40 underline-offset-4 hover:decoration-current"
                >
                  See pricing
                </Link>
              </div>
              <LastUpdated isoDate={PAGE_UPDATED} className="mt-6 text-sm opacity-70" />
            </div>
          </Container>
          <p className={`absolute right-4 bottom-4 text-[0.7rem] opacity-60 sm:right-8 sm:bottom-6 ${ON_PHOTO}`}>
            Photo: Michael Njoroge, Unsplash
          </p>
        </div>
        <div aria-hidden className="hero-spacer" />
      </section>

      {/* Taxi top: product block after the Somo reference. Name, plain description and the numbers
          on the left; our own car with the live roof screen on the right; three features below. */}
      <section id="taxi-top" aria-labelledby="taxi-title" className="scroll-mt-20 py-16 sm:py-24">
        <Container>
          <SectionRule />
          <div className="mt-12 grid gap-14 lg:mt-16 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-5">
              <h2
                id="taxi-title"
                className="text-5xl leading-[0.95] font-semibold tracking-[-0.035em] text-foreground sm:text-6xl"
              >
                {taxi.label}
              </h2>
              <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-foreground/85">
                A double-sided LED screen on the roof of a partner taxi, seen from the pavement and
                the next lane. Each screen plays a loop of advertisers, and you buy plays: how often
                you come round, where and when.
              </p>

              <h3 className="mt-10 text-sm font-medium text-muted-foreground">By the numbers</h3>
              <dl className="mt-2 max-w-sm divide-y divide-border">
                {[
                  { value: `${taxi.widthMm} × ${taxi.heightMm}`, label: "mm screen, both sides" },
                  {
                    value: `${slotLengthOptions.length}`,
                    label: `ad lengths, ${slotLengthOptions[0]!.seconds} to ${slotLengthOptions.at(-1)!.seconds} seconds`,
                  },
                  { value: "1 day", label: "shortest flight" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline gap-5 py-4">
                    <dt className="order-2 leading-snug text-muted-foreground">{row.label}</dt>
                    <dd className="order-1 shrink-0 text-4xl font-light tracking-tight text-foreground tabular-nums">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <figure className="lg:col-span-7">
              <TaxiLoop />
              <figcaption className="mt-4 text-sm text-muted-foreground">
                Illustration of our roof unit, with sample ads from our demo network. Pick a slot to
                preview it.
              </figcaption>
            </figure>
          </div>

          <div id="targeting" className="mt-20 scroll-mt-24 border-t border-border pt-12">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Show it where, when and on the days it matters
            </h3>
            <p className="mt-3 max-w-[60ch] leading-relaxed text-muted-foreground">
              Every booking is geo-targeted: narrow it by area, time of day and dates, so the ad on
              the roof matches the street it&apos;s driving down.
            </p>
            <div className="mt-10">
              <TargetingScreens
                items={[
                  {
                    adId: "mtaa-kicks",
                    title: "By place",
                    body: "Book Westlands only, and the ad sends people a few minutes up the road to the shop.",
                  },
                  {
                    adId: "kahawa-house",
                    title: "By time of day",
                    body: "Run it from 6 to 9am only, the hours the offer is good for.",
                  },
                  {
                    adId: "nairobi-nights",
                    title: "By date",
                    body: "Play it in the days before the event and stop the morning after. Flights start from one day.",
                  },
                ]}
              />
            </div>
            <p className="mt-12 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
              Sample ads from our demo network. Every taxi-top ad can be a video or a still (
              {CREATIVE_FORMATS_LABEL}, up to {maxMb} MB), and every play is logged against the
              taxi&apos;s GPS.{" "}
              <Link href="/media-kit" className="font-medium text-foreground underline underline-offset-4">
                Creative specs
              </Link>
              {" · "}
              <Link href="#how" className="font-medium text-foreground underline underline-offset-4">
                How a campaign works
              </Link>
            </p>
          </div>
        </Container>
      </section>

      {/* Delivery bike: a dark band with the night photo running to the screen edge. */}
      <section
        id="delivery-bike"
        aria-labelledby="bike-title"
        className={cn("scroll-mt-20 lg:grid lg:grid-cols-12", NIGHT, ON_PHOTO)}
      >
        <figure className="relative lg:col-span-5">
          <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[44rem]">
            <Image
              src="/products/delivery-scooter.jpg"
              alt="A delivery rider on a red scooter with a cargo box, moving through a city street at night"
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover object-[42%_50%]"
            />
          </div>
          <figcaption className="px-4 py-3 text-[0.7rem] opacity-70 sm:px-8 lg:absolute lg:inset-x-6 lg:bottom-3 lg:p-0">
            A delivery box like the ones our riders carry; ours adds the LED screens. Photo: Rowan
            Freeman, Unsplash.
          </figcaption>
        </figure>

        <div className="px-4 py-16 sm:px-8 sm:py-24 lg:col-span-7 lg:px-14 xl:px-20">
          <div className="max-w-2xl">
            <h2 id="bike-title" className={H2_PRODUCT}>
              {bike.label}: the sides are yours
            </h2>
            <p className="mt-4 max-w-[58ch] text-lg leading-relaxed opacity-90">
              An LED cargo box on a delivery bike, riding through estates and lunch-hour streets.
              Book one, two or all {bikeSidesOptions.length} sides and nobody else&apos;s ad appears
              on them for the whole flight.
            </p>

            <div className="mt-10">
              <BikeSides options={bikeSidesOptions} onDark />
            </div>
            <p className="mt-5 text-sm opacity-70">
              Laid flat, the three sides make the same 3:1 strip as one taxi top.
            </p>

            <Facts
              dark
              className="mt-12"
              specs={[
                { label: "Screen", value: `${bike.widthMm} × ${bike.heightMm} mm per side` },
                { label: "Artwork", value: bike.aspectLabel },
                { label: "Faces", value: "Left, right, rear" },
                { label: "Pixel pitch", value: bike.pitch ?? "TBC" },
                { label: "Typical booking", value: "1 week" },
                { label: "Priced", value: "Per side, per day" },
              ]}
            />
            <BestFor
              dark
              items={[
                "Food, retail and services selling into residential estates",
                "Staying visible all day in one neighbourhood",
                "Brands that want a screen to themselves",
              ]}
            />
          </div>
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-16 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 id="how-title" className={cn(H2, "text-foreground")}>
                How a campaign works
              </h2>
              <ol className="mt-10">
                {steps.map((step, i) => {
                  const last = i === steps.length - 1
                  return (
                    <li
                      key={step.title}
                      className={cn(
                        "relative grid grid-cols-[2.25rem_1fr] gap-x-4",
                        !last &&
                          "pb-9 before:absolute before:top-10 before:bottom-1 before:left-[1.125rem] before:w-px before:bg-border",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums",
                          last ? "bg-primary text-primary-foreground" : "border border-foreground/25 text-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="pt-1">
                        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                        <p className="mt-1.5 max-w-[46ch] leading-relaxed text-muted-foreground">{step.body}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>

            <div className="lg:col-span-7 lg:pt-3">
              <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_60px_-34px_oklch(0.26_0.024_262/0.4)] lg:sticky lg:top-24">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border px-5 py-4 sm:px-7">
                  <p className="font-semibold text-foreground">Your campaign, Westlands</p>
                  <p className="text-sm text-muted-foreground">Proof of play, today</p>
                </div>
                <table className="w-full text-left text-sm sm:text-base">
                  <caption className="sr-only">Sample proof-of-play report</caption>
                  <thead className="text-sm text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 pt-4 pb-2 font-medium sm:px-7">Time</th>
                      <th scope="col" className="px-3 pt-4 pb-2 font-medium">Road</th>
                      <th scope="col" className="hidden px-3 pt-4 pb-2 font-medium sm:table-cell">Area</th>
                      <th scope="col" className="px-5 pt-4 pb-2 font-medium sm:px-7">Screen</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {samplePlays.map((play) => (
                      <tr key={play.time}>
                        <td className="px-5 py-2.5 tabular-nums sm:px-7">{play.time}</td>
                        <td className="px-3 py-2.5">{play.road}</td>
                        <td className="hidden px-3 py-2.5 sm:table-cell">{play.area}</td>
                        <td className="px-5 py-2.5 tabular-nums sm:px-7">{play.screen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <figcaption className="border-t border-border px-5 py-4 text-sm text-muted-foreground sm:px-7">
                  Sample report. Each row is one play: when it ran, the road, and the screen that
                  showed it, from the vehicle&apos;s GPS. Yours lists every play.
                </figcaption>
              </figure>
            </div>
          </div>
        </Container>
      </section>

      <section id="creative" aria-labelledby="creative-title" className="scroll-mt-20 border-t border-border bg-muted/60 py-16 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="lg:order-2 lg:col-span-5">
              <h2 id="creative-title" className={cn(H2_PRODUCT, "text-foreground")}>
                No designer? We&apos;ll make your ads
              </h2>
              <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-foreground/90">
                Share your brief and we&apos;ll design the artwork in the exact shape each screen
                needs: {taxi.aspectLabel} for taxi tops, {bike.aspectLabel} for bike boxes. The fee
                depends on the visuals you need and your brief, and we quote before we start.
              </p>
              <h3 className="mt-8 text-base font-semibold text-foreground">What shapes the quote</h3>
              <ul className="mt-3 space-y-2">
                {[
                  "The kind of visual: a still image, an animation, or a video cut from footage you supply",
                  "How many versions: one per offer, area, time of day or language",
                  "What you already have: logo, brand colours, photos or footage",
                ].map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild size="lg" className="active:scale-[0.98]">
                  <Link href="/start-campaign?creative=needs_design">Get a creative quote</Link>
                </Button>
                <p className="text-sm text-muted-foreground">We quote it with your campaign.</p>
              </div>
            </div>

            <figure className="lg:order-1 lg:col-span-7">
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <p className="font-semibold text-foreground">Example brief</p>
                <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    ["Brand", "Kahawa House"],
                    ["Offer", "2nd cup free before 9am"],
                    ["Where and when", "CBD and Westlands, 6 to 9am"],
                    ["They supplied", "Logo, brand colour, coffee footage"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div aria-hidden className="ml-8 h-8 w-px bg-border" />
              <CreativeExample />
              <figcaption className="mt-4 text-sm text-muted-foreground">
                What we&apos;d deliver: the same ad in both screen shapes, drawn to scale. Kahawa House
                is a made-up brand from our demo network.
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <section aria-labelledby="compare-title" className="border-t border-border py-16 sm:py-24">
        <Container>
          <h2 id="compare-title" className={cn(H2, "text-foreground")}>
            Taxi-top LED vs static billboards vs delivery bikes
          </h2>
          <p className="mt-4 max-w-[58ch] leading-relaxed text-muted-foreground">
            A category-level comparison for planners weighing moving digital OOH in Kenya. Named
            operators are not ranked here; pick the format that fits your brief.
          </p>
          <OohComparisonTable />
        </Container>
      </section>

      <section aria-labelledby="faq-title" className="border-t border-border py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="self-start lg:sticky lg:top-24 lg:col-span-4">
              <h2 id="faq-title" className={cn(H2, "text-foreground")}>
                Common questions
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Something we haven&apos;t covered?{" "}
                <Link href="/help/contact" className="font-medium text-foreground underline underline-offset-4">
                  Ask us
                </Link>
                .
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border lg:col-span-8">
              {productsFaqItems.map((item, n) => (
                <details key={item.q} open={n === 0} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-medium text-foreground marker:content-none sm:text-xl [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform duration-300 ease-out group-open:rotate-45"
                    >
                      <Plus className="size-4" strokeWidth={1.75} />
                    </span>
                  </summary>
                  <p className="max-w-[62ch] pb-6 leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container>
          <div className="rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  Tell us what you&apos;re promoting
                </h2>
                <p className="mt-3 leading-relaxed opacity-90">
                  Share your dates, areas and budget. We&apos;ll come back with availability across{" "}
                  {LIVE_CITY}, with {nextCitiesList} next on the rollout.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 active:scale-[0.98]"
                >
                  <Link href="/start-campaign">Start a campaign</Link>
                </Button>
                <Link
                  href="/partner-fleet"
                  className="text-sm font-medium underline decoration-current/40 underline-offset-4 hover:decoration-current"
                >
                  Run a fleet? Partner with us
                </Link>
              </div>
            </div>
          </div>
          <LastUpdated className="mt-6 text-sm text-muted-foreground" />
        </Container>
      </section>
    </>
  )
}

function Facts({
  specs,
  dark = false,
  className,
}: {
  specs: readonly { label: string; value: string }[]
  dark?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
        {specs.map((spec) => (
          <div key={spec.label}>
            <dt className={cn("text-sm", dark ? "opacity-70" : "text-muted-foreground")}>{spec.label}</dt>
            <dd className={cn("mt-1 text-lg font-semibold tabular-nums", !dark && "text-foreground")}>
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className={cn("mt-5 text-sm", dark ? "opacity-70" : "text-muted-foreground")}>
        Files: {CREATIVE_FORMATS_LABEL}, up to {maxMb} MB each.
      </p>
    </div>
  )
}

function BestFor({ items, dark = false }: { items: readonly string[]; dark?: boolean }) {
  return (
    <div className="mt-10">
      <h3 className={cn("text-base font-semibold", !dark && "text-foreground")}>Best for</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className={cn("flex gap-3 leading-relaxed", dark ? "opacity-85" : "text-muted-foreground")}>
            <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Somo-style section opener: a full hairline with a short heavier segment at the start. */
function SectionRule() {
  return (
    <div aria-hidden className="relative h-px bg-border">
      <span className="absolute -top-px left-0 h-[3px] w-16 bg-foreground" />
    </div>
  )
}
