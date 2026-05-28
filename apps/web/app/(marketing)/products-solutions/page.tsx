import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "@/components/landing/container"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Products & solutions",
  description:
    "Digital taxi-top and delivery-bike signage for Kenyan cities: geo-led scheduling, verified motion media, and short flights for brands.",
  path: "/products-solutions",
})

function PlaceholderVis({ caption }: { caption: string }) {
  return (
    <figure className="bg-card flex aspect-[16/11] flex-col justify-end rounded-2xl border border-border p-6 sm:aspect-auto sm:min-h-[220px]">
      <span className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">
        Visual placeholder
      </span>
      <figcaption className="text-foreground mt-2 max-w-[36ch] text-sm leading-relaxed">{caption}</figcaption>
    </figure>
  )
}

export default function ProductsSolutionsPage() {
  return (
    <div className="border-b border-border pb-14 sm:pb-20">
      <section className="border-border border-b bg-foreground text-background py-14 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-2xl space-y-6">
            <div className="space-y-3">
              <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                Products & solutions · Kenya rollout
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                Digital screens that ride with Kenyan traffic
              </h1>
              <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed sm:text-xl">
                Screens on taxis and delivery bikes tuned for real movement. Geography, calendars, and creative QA ship
                with every booking so bursts stay fast without turning into roadside guesswork.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                <Link href="/start-campaign">Talk to us</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-background/35 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <Link href="/partner-fleet">Partner your fleet</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[1fr,minmax(0,0.92fr)] lg:gap-16">
            <div className="max-w-xl space-y-6">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">Digital taxi tops</h2>
              <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
                Screens ride above bumper-to-bumper sight lines. Creatives rotate with the network so every route hour can
                match a corridor plan instead of guessing which static boards might clear.
              </p>
              <p className="text-muted-foreground text-base leading-relaxed">
                Built for Nairobi first, expandable along the Kenyan rollout corridor as fleets come online behind you.
              </p>
            </div>
            <PlaceholderVis caption="Unit photography and real reach charts land here once media is signed off." />
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">Illustrative only</p>
          <h2 className="text-foreground mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-[2rem]">
            Reference numbers for conversations
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-relaxed">
            Figures below are placeholders for decks, not audited performance guarantees.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
              <p className="tab-nums text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">60+ km</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Example daily linked route distance sampled before audited loop data ships.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
              <p className="tab-nums text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">8 to 12 hrs</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Example on-street uptime window negotiated per operational pack and city rules.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
              <p className="tab-nums text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">1 day min</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Shortest illustrative flight referenced on the homepage minimums messaging.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr),1fr] lg:gap-16">
            <PlaceholderVis caption="Annotated city overlay or corridor map sample for geo routing conversations." />
            <div className="max-w-xl lg:justify-self-end">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Geo-aware routing instead of postcode guesswork
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                Bundle neighbourhoods, arterial roads, staging yards, or event approach routes inside the same playbook.
                When inventory moves, placements move with traffic instead of fading on a billboard no one revisits twice.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr,minmax(0,0.92fr)] lg:gap-16">
            <div className="max-w-xl lg:order-1">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Video-forward units with legibility checks baked in
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                Looping motion is allowed wherever codecs meet the spec sheet. Operators review readability at curb grade
                and safe zones before the first kilometer rolls under a screen.
              </p>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                Technical targets live in your media kit so agencies can traffick once and reuse across fleets.
              </p>
            </div>
            <div className="lg:order-2">
              <PlaceholderVis caption="Creative safe-zone diagram or looping render pull still from QA bench." />
            </div>
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr),1fr] lg:gap-16">
            <PlaceholderVis caption="Schedule grid concept for bursts vs sustained books layered on rollout cities." />
            <div className="max-w-xl lg:justify-self-end">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Burst tests and national-scale stories in one playbook
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                Start with ultra-short flights to qualify creative, stack multi-city arcs when fleets align, then sustain
                the winners. Ops keeps legal, procurement, and network teams synced on blackout rules and pacing.
              </p>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                Programmatic SSP hookups remain on the roadmap until supply is metered continuously end to end.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[1fr,minmax(0,0.92fr)] lg:gap-16">
            <div className="max-w-xl space-y-6 lg:order-1">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Delivery enclosures for last-mile corridors
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
                Smaller footprints match dispatch bikes courting dense estates and commuter staging lots. Placement
                matches e-commerce timelines and midday lunch runs where taxis might be sparse but ridership spikes.
              </p>
              <p className="text-muted-foreground text-base leading-relaxed">
                Specs inherit the same creative gates as taxi tops so a single trafficking doc can unlock both silhouettes.
              </p>
            </div>
            <div className="lg:order-2">
              <PlaceholderVis caption="Bike box hardware render paired with kinetic route shot when assets exist." />
            </div>
          </div>
        </Container>
      </section>

      <section className="border-border border-t py-14 sm:py-20">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Ready when your brief locks
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Share flight intent and we assemble availability plus deck-ready proof points for Nairobi and the wider
                rollout map.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/start-campaign">Talk to us</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/partner-fleet">Partner your fleet</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}
