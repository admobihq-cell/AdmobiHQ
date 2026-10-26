import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import { DEMO_ADS } from "@workspace/ops-contracts"

import { AdCreative, PanelFace } from "@/app/(marketing)/products-solutions/screens"

import { Container } from "./container"

/** A demo-network ad drawn without its video (no `src`), so the brand band fills the screen. */
const SAMPLE_AD = { ...DEMO_ADS.find((a) => a.id === "nairobi-nights")!, src: undefined }

/** Off-white for text on photos; fixed so it holds in both themes. */
const ON_PHOTO = "text-[oklch(0.985_0.008_82)]"

type Service = {
  title: string
  body: string
  /** Section on /products-solutions this card opens. */
  href: string
  art: ReactNode
}

function Photo({ src, alt, position }: { src: string; alt: string; position: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 80vw"
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      style={{ objectPosition: position }}
    />
  )
}

/**
 * The taxi-top card: our own roof unit (the keyed car from the products page) on the brand
 * terracotta, with a sample ad lit on the screen. ROOF is the screen face inside the 876 x 428 PNG.
 */
function TaxiTopArt() {
  const ROOF = { left: "49.09%", top: "3.5%", width: "23.06%" }
  return (
    <div className="absolute inset-0 bg-[oklch(0.48_0.14_43)]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_42%,oklch(0.6_0.13_50/0.55),transparent)]"
      />
      <div className="absolute inset-x-[-18%] top-[24%] aspect-[876/428] transition-transform duration-700 ease-out group-hover:scale-[1.03]">
        <span className="absolute inset-x-[6%] bottom-[-2%] h-[8%] rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.18_0.03_40/0.5),transparent)]" />
        <Image
          src="/products/taxi-top-unit.png"
          alt="Admobi roof unit on a partner car, playing a sample ad"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
        />
        <div className="absolute" style={ROOF}>
          <PanelFace className="aspect-[3/1] rounded-[2px]">
            <AdCreative ad={SAMPLE_AD} shape="taxi" play={false} still />
          </PanelFace>
        </div>
      </div>
    </div>
  )
}

const services: readonly Service[] = [
  {
    title: "Taxi-top LED screens",
    body: "Double-sided screens on partner taxis, playing your ad in a shared loop across the city.",
    href: "/products-solutions#taxi-top",
    art: <TaxiTopArt />,
  },
  {
    title: "Delivery bike boxes",
    body: "LED screens on three sides of a delivery box, booked for you alone in the estates you pick.",
    href: "/products-solutions#delivery-bike",
    art: (
      <Photo
        src="/products/delivery-scooter.jpg"
        alt="A delivery rider on a scooter with a cargo box at night"
        position="42% 50%"
      />
    ),
  },
  {
    title: "Ad design",
    body: "No designer? Share your brief and we make the ad in both screen shapes, quoted first.",
    href: "/products-solutions#creative",
    art: (
      <Photo
        src="/products/ad-design.jpg"
        alt="A designer at a laptop and drawing tablet, with colour swatches and markers"
        position="12% 50%"
      />
    ),
  },
  {
    title: "Targeting and proof of play",
    body: "Choose the areas, hours and dates. Every play is logged against GPS for your report.",
    href: "/products-solutions#targeting",
    art: (
      <Photo
        src="/products/nairobi-skyline.jpg"
        alt="Nairobi skyline with a highway winding between the towers"
        position="50% 60%"
      />
    ),
  },
]

export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        {/* One reading path: label, title, then the line that explains it. The link is the
            section's "see all" for the cards below, so it sits at the far end of the header
            on desktop instead of under the paragraph competing with the title. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div>
            <p className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
              Our services
            </p>
            <h2
              id="services-title"
              className="mt-5 text-balance text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl"
            >
              What we can run for you
            </h2>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
              Screens on taxis and delivery bikes, the ads to put on them, and a record of every
              play. Pick one to see how it works.
            </p>
          </div>
          <div>
            <Link
              href="/products-solutions"
              className="group inline-flex items-center gap-3 rounded-full border border-foreground/15 bg-card py-1.5 pr-1.5 pl-5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
            >
              See products &amp; solutions
              <span className="grid size-9 place-items-center rounded-full bg-foreground text-background transition-transform duration-300 ease-out group-hover:rotate-45">
                <ArrowUpRight aria-hidden className="size-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Phones and tablets scroll the cards sideways. From lg they share one row, and the card
            under the pointer (or holding focus) grows while its neighbours give way. */}
        <ul className="-mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:h-[32rem] lg:snap-none lg:overflow-visible lg:px-0 lg:pb-0">
          {services.map((service) => (
            <li
              key={service.title}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto lg:flex-1 lg:transition-[flex-grow] lg:duration-500 lg:ease-[cubic-bezier(0.16,1,0.3,1)] lg:hover:grow-[1.9] lg:focus-within:grow-[1.9] motion-reduce:transition-none"
            >
              <Link
                href={service.href}
                className="group relative block aspect-[3/4] h-full overflow-hidden rounded-2xl bg-muted outline-offset-4 lg:aspect-auto"
              >
                {service.art}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-3/4 bg-[linear-gradient(to_top,oklch(0.15_0.02_262/0.9),oklch(0.15_0.02_262/0.45)_55%,transparent)]"
                />
                <span
                  aria-hidden
                  className={`absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-[oklch(0.15_0.02_262/0.4)] ring-1 ring-[oklch(1_0_0/0.3)] backdrop-blur-sm transition-[background-color,color,transform] duration-300 group-hover:rotate-45 group-hover:bg-[oklch(0.985_0.008_82)] group-hover:text-[oklch(0.26_0.024_262)] ${ON_PHOTO}`}
                >
                  <ArrowUpRight className="size-4" />
                </span>
                <span className={`absolute inset-x-5 bottom-5 ${ON_PHOTO}`}>
                  <span className="block text-xl leading-snug font-semibold tracking-tight">{service.title}</span>
                  {/* Always shown on touch layouts; on lg it opens as the card grows. */}
                  <span className="mt-2 block max-w-[34ch] text-sm leading-relaxed opacity-85 lg:grid lg:grid-rows-[0fr] lg:opacity-0 lg:transition-[grid-template-rows,opacity] lg:duration-500 lg:ease-out lg:group-hover:grid-rows-[1fr] lg:group-hover:opacity-85 lg:group-focus-visible:grid-rows-[1fr] lg:group-focus-visible:opacity-85">
                    <span className="lg:overflow-hidden">{service.body}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
