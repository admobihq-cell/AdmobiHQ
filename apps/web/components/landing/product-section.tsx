import { Container } from "./container"
import { InView } from "./in-view"
import { SystemAnatomy } from "./system-illustration"

const nodes = [
  {
    label: "Fleet",
    body: "Rooftop LED units on partner taxis. High-brightness creatives sized for curb height and modest distance.",
  },
  {
    label: "Network",
    body: "Hardware reports back, content syncs centrally. Geo and time routing target the corridors that match the brief.",
  },
  {
    label: "Schedule",
    body: "Short bursts or sustained books. Minimum campaign length communicated clearly upfront.",
  },
  {
    label: "Creative QA",
    body: "Spec sheet for codecs, durations, and safe zones. Creative reviewed before vehicles roll.",
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

        <figure className="mt-12 hidden lg:block">
          <InView>
            <SystemAnatomy className="block w-full" />
          </InView>
          <figcaption className="sr-only">
            Admobi system flow from fleet hardware to network to schedule to creative quality assurance.
          </figcaption>
        </figure>

        <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:mt-14 lg:grid-cols-4 lg:gap-x-8">
          {nodes.map((node, i) => (
            <div key={node.label} className="grid grid-cols-[3rem_1fr] items-baseline gap-x-3 sm:block">
              <span className="font-mono text-xs text-primary uppercase tracking-wider sm:block">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="sm:mt-3">
                <dt className="text-lg font-semibold text-foreground">{node.label}</dt>
                <dd className="text-muted-foreground mt-2 max-w-[40ch] text-sm leading-relaxed sm:text-base">
                  {node.body}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
