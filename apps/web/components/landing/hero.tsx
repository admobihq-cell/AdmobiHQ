import Image from "next/image"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "./container"
import { InView } from "./in-view"
import { RouteSignal } from "./system-illustration"

const LOGO_PREFIX = "/logo%20Carousel"

const heroLogos = [
  { src: `${LOGO_PREFIX}/safaricom.png`, alt: "Safaricom" },
  { src: `${LOGO_PREFIX}/naivas.png`, alt: "Naivas" },
  { src: `${LOGO_PREFIX}/eabl.png`, alt: "EABL" },
  { src: `${LOGO_PREFIX}/java.png`, alt: "Java House" },
  { src: `${LOGO_PREFIX}/sarova.png`, alt: "Sarova Hotels" },
  { src: `${LOGO_PREFIX}/tsavo.png`, alt: "Tsavo" },
] as const

export function HeroSection() {
  return (
    <section className="relative border-b border-border pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
      <Container>
        <div className="mx-auto max-w-[60rem] text-center">
          <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-[0.22em] sm:text-xs">
            Nairobi · Digital taxi-top screens
          </p>
          <h1 className="mx-auto mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.6rem]">
            <span className="block">Taxi-top advertising in Nairobi —</span>
            <span className="block">LED screens that move with the city</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-[58ch] text-pretty text-base leading-relaxed sm:text-lg">
            Admobi is Kenya&apos;s digital OOH network for taxi-top LED advertising in Nairobi: geo-targeted screens on partner vehicles, bookable by corridor and time window, with GPS proof-of-play from one-day tests to sustained campaigns.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg">
              <Link href="/start-campaign">Start a campaign</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/partner-fleet">Join as fleet manager</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-[52rem] text-center sm:mt-16">
          <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-[0.24em] sm:text-[0.7rem]">
            In rotation across campaigns for
          </p>
          <ul className="mt-5 grid grid-cols-3 items-center justify-items-center gap-x-6 gap-y-5 sm:grid-cols-6 sm:gap-x-8">
            {heroLogos.map((logo) => (
              <li key={logo.src} className="flex h-7 items-center justify-center sm:h-8">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={120}
                  height={32}
                  className="max-h-7 w-auto max-w-[6rem] object-contain opacity-70 sm:max-h-8"
                />
              </li>
            ))}
          </ul>
        </div>

        <InView className="relative isolate mx-auto mt-14 w-full max-w-[64rem] sm:mt-20">
          <RouteSignal className="aspect-[4/3] w-full sm:aspect-[16/9]" />
        </InView>
      </Container>
    </section>
  )
}
