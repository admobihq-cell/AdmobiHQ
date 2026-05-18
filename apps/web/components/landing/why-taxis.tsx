import { Container } from "./container"
import { InView } from "./in-view"
import { StaticVsMoving } from "./system-illustration"

const claims = [
  "Screens move through the neighbourhoods and corridors your buyers already cross, hour by hour.",
  "Repeat trips build frequency without stitching together dozens of static faces.",
  "Pair geo cues with bursts for launches and events instead of committing to a yearly hold.",
] as const

function ClaimMarker() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="mt-[0.45rem] h-3 w-6 shrink-0 text-primary"
    >
      <path
        d="M 2 14 Q 8 4 14 12 T 22 8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function WhyTaxisSection() {
  return (
    <section id="why" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
          <div className="max-w-prose">
            <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-[0.22em] sm:text-xs">
              Why moving screens
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
              Static panels hold one spot. Yours moves with the brief.
            </h2>
            <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
              Taxi-top units cross the same audience the city already crosses, so frequency comes from the route rather than from buying more faces.
            </p>
            <ul className="mt-8 list-none space-y-5">
              {claims.map((claim) => (
                <li key={claim} className="flex gap-4">
                  <ClaimMarker />
                  <p className="text-foreground text-base leading-relaxed sm:text-lg">
                    {claim}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <InView className="relative isolate w-full">
            <StaticVsMoving className="aspect-[4/3] w-full" />
          </InView>
        </div>
      </Container>
    </section>
  )
}
