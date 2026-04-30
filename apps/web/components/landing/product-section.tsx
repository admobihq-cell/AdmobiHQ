import { Container } from "./container"

const bullets = [
  {
    title: "Rooftop LED units",
    body: "High-brightness creatives sized for readability at curb height and modest distance.",
  },
  {
    title: "Geo and time routing",
    body: "Target areas and shifts that match briefs instead of locking to a single postcode panel.",
  },
  {
    title: "Flexible scheduling",
    body: "Run short bursts or sustained books. Minimum campaign length communicated clearly upfront.",
  },
  {
    title: "Creative delivery",
    body: "Spec sheet for codecs, durations, and safe zones. QA before vehicles roll.",
  },
] as const

export function ProductSection() {
  return (
    <section id="product" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            The product
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
            Hardware on fleet partners, content managed centrally, delivery aligned to your geography and calendar.
          </p>
        </div>
        <ol className="mt-12 space-y-0 divide-y divide-border rounded-2xl border border-border">
          {bullets.map((item, i) => (
            <li key={item.title} className="grid gap-3 p-6 sm:grid-cols-[7rem_1fr] sm:gap-8 sm:p-8">
              <span className="font-mono text-xs text-primary uppercase tracking-wider">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground mt-2 max-w-[62ch] text-sm leading-relaxed sm:text-base">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
