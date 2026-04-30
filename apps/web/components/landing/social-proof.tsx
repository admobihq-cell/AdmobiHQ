import { Container } from "./container"

const placeholderLogos = ["Brand One", "Event Co", "Nationwide Bank", "Series B Co"] as const

export function SocialProofSection() {
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <Container>
        <h2 className="text-muted-foreground text-center text-xs font-semibold uppercase tracking-[0.2em]">
          Brands and teams who will plug in here
        </h2>
        <div className="mx-auto mt-8 flex flex-wrap justify-center gap-6 sm:gap-10">
          {placeholderLogos.map((name) => (
            <div
              key={name}
              className="text-muted-foreground flex h-14 min-w-[7.5rem] items-center justify-center rounded-xl border border-dashed border-border px-6 text-xs font-medium tracking-wide sm:text-sm"
            >
              {name}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
