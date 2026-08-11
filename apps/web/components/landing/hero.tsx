"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "./container"
import { GreenScreenCarVideo } from "./green-screen-car"
import { InView } from "./in-view"
import { RouteSignal } from "./system-illustration"

export function HeroSection() {
  return (
    <section className="relative border-b border-border pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
      <Container>
        <div className="mx-auto max-w-[60rem] text-center">
          <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-[0.22em] sm:text-xs">
            Nairobi · Digital taxi-top screens
          </p>
          <h1 className="mx-auto mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.6rem]">
            <span className="block">Taxi-top advertising in Nairobi</span>
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

        <InView className="relative isolate mx-auto mt-14 w-full max-w-[64rem] sm:mt-20">
          {/* Exact 16:9 aspect ratio container matching the RouteSignal SVG viewBox (800x450) */}
          <div className="relative w-full aspect-[16/9]">
            <RouteSignal className="absolute inset-0 w-full h-full" />

            {/* Client-side green screen removal component using HTML5 Canvas */}
            <GreenScreenCarVideo />
          </div>
        </InView>
      </Container>
    </section>
  )
}
