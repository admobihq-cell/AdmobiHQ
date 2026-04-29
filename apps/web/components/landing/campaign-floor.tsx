import { Container } from "./container"

export function CampaignFloorSection() {
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <Container>
        <div className="rounded-2xl border border-border bg-muted/35 px-6 py-8 sm:px-10 sm:py-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            Minimum booking
          </h2>
          <p className="text-muted-foreground mt-3 max-w-[62ch] text-base leading-relaxed">
            Campaigns can run from <strong className="text-foreground font-semibold">one day</strong> upward depending on fleet availability and materials. Exact inventory and blackout rules are confirmed during planning.
          </p>
        </div>
      </Container>
    </section>
  )
}
