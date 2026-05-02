import { Container } from "./container"

const bullets = [
  "Screens move through the neighbourhoods and corridors your buyers already cross, hour by hour.",
  "Repeat trips create frequency without stitching together dozens of static faces.",
  "Pair geo cues with bursts for launches and events instead of committing to yearly hold.",
] as const

export function WhyTaxisSection() {
  return (
    <section id="why" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="max-w-prose space-y-6 lg:col-span-1">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Why moving screens
            </h2>
            <ul className="text-muted-foreground list-disc space-y-3 ps-6 text-base leading-relaxed sm:text-lg">
              {bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <figure className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Illustrative only
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
                Example: 150k+ daily impressions
              </p>
              <figcaption className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Replace with audited delivery data when your network is metered end to end.
              </figcaption>
            </figure>
          </div>
          <blockquote className="flex flex-col justify-center gap-4 rounded-2xl border border-border bg-background p-6 sm:p-8 lg:min-h-[280px]">
            <p className="text-foreground text-lg font-medium leading-snug sm:text-xl">
              “We needed a fast burst across two neighbourhoods. Traditional OOH lead times couldn’t hit the window.”
            </p>
            <footer className="text-muted-foreground border-border border-t pt-4 text-sm">
              Replace with named client story.
            </footer>
          </blockquote>
        </div>
      </Container>
    </section>
  )
}
