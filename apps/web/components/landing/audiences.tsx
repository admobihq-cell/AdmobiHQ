import { Container } from "./container"

const rows = [
  {
    label: "SME and growth brands",
    detail: "Test cities and messages with lower minimums than classic full-network OOH.",
  },
  {
    label: "Corporates",
    detail: "Coordinate product and retail pushes with corridor and rush-hour emphasis.",
  },
  {
    label: "Events",
    detail: "Surround venues and approach routes in the days before and during showtime.",
  },
  {
    label: "Election-related campaigns",
    detail: "Where permitted, schedule visibility that follows districts and voting timelines.",
  },
] as const

export function AudiencesSection() {
  return (
    <section id="who" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          <div className="max-w-xl shrink-0 space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Who uses Admobi
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Buyers range from nimble SMEs to regulated campaign teams. Messaging stays flexible within your compliance rules.
            </p>
          </div>
          <dl className="min-w-0 flex-1 space-y-0 divide-y divide-border">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-6 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:gap-8">
                <dt className="text-foreground text-sm font-semibold">{row.label}</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">{row.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  )
}
