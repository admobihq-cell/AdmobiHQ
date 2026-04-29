import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Container } from "./container"

export function CtaBandSection() {
  return (
    <section className="border-b border-border bg-muted/45 py-14 sm:py-16">
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
            Ready when you are
          </h2>
          <p className="text-muted-foreground max-w-[50ch] text-base leading-relaxed">
            Start a booking conversation or unlock fleet onboarding. Prefer to stay informed first? Jump to waitlist below.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="#campaign">Start a campaign</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#fleet">Join as fleet manager</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="text-foreground">
            <Link href="#waitlist">Waitlist updates</Link>
          </Button>
        </div>
      </Container>
    </section>
  )
}
