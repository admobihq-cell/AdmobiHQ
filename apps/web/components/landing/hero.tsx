import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "./container"

export function HeroSection() {
  return (
    <section className="relative border-b border-border pb-14 pt-10 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
          <div className="min-w-0 space-y-6">
            <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-[0.22em] sm:text-xs">
              Nairobi · Digital taxi-top screens
            </p>
            <h1 className="max-w-[20ch] text-balance text-4xl font-semibold leading-[1.07] tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
              Reach the city from the roofline up.
            </h1>
            <p className="max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              LED units on taxis put your creative in motion with geo and schedule control. Built for bursts, launches, and campaigns that need to move with demand.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="#campaign">Start a campaign</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#fleet">Join as fleet manager</Link>
              </Button>
            </div>
          </div>
          <figure className="relative isolate min-h-[240px] overflow-hidden rounded-2xl border border-border bg-muted/70 sm:min-h-[280px] lg:min-h-[320px]">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 35% 35%, var(--color-foreground) 0, transparent 52%)",
              }}
              aria-hidden
            />
            <div className="absolute inset-6 flex flex-col justify-end gap-2 sm:inset-8">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Visual placeholder
              </p>
              <p className="max-w-[40ch] text-sm leading-relaxed text-foreground/90">
                Hero photography of taxi-top hardware in Nairobi traffic will sit here. Tone: daylight, sharp screen, city context.
              </p>
            </div>
          </figure>
        </div>
      </Container>
    </section>
  )
}
