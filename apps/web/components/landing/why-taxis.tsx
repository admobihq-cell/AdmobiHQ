import { Container } from "./container"

export function WhyTaxisSection() {
  return (
    <section id="why" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="max-w-prose space-y-4 lg:col-span-1">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Why moving screens
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              Fixed boards wait for eyes. Taxis circulate through the routes and hours your audience already uses. Repeat exposure across trips builds recognition without renting every static face in town.
            </p>
            <figure className="mt-8 rounded-2xl border border-border bg-muted/40 p-5">
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
