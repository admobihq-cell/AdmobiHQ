import { Container } from "./container"

const paras = [
  <>Admobi&apos;s mission is to bring dynamic storytelling to the streets of our cities.</>,
  <>
    Admobi is a data-first network built for accountable delivery in digital out-of-home. Route-level planning, proof-of-play anchored to GPS-equipped units, and calendar control help teams measure what ran, tune schedules, and optimize creative over time.
  </>,
  <>
    Dynamic mobility formats carry targeted messaging at the right corridor and shift. From LED taxi tops to delivery-bike enclosures, we help brands engage people on daily journeys throughout Kenya with the flexibility that bursts and sustained books need as traffic moves.
  </>,
  <>
    Taxi-top screens on partner vehicles reach Kenyan cities beginning with Nairobi, deepening as fleet partners grow along the rollout plan. Where last-mile corridors matter, delivery-bike inventory follows the same trafficking and brand-safety standards so planners do not rebuild specs from scratch.
  </>,
] as const

export function MissionSection() {
  return (
    <section id="mission" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl space-y-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">Our mission</h2>
          <div className="space-y-5 text-muted-foreground text-base leading-relaxed sm:text-lg">
            {paras.map((p, i) => (
              <p key={i} className={i === 0 ? "text-foreground font-medium" : undefined}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
