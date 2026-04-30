import { Container } from "./container"

const cities = [
  { name: "Nairobi", status: "live" as const },
  { name: "Mombasa", status: "coming" as const },
  { name: "Eldoret", status: "coming" as const },
  { name: "Nakuru", status: "coming" as const },
] as const

export function MarketsSection() {
  return (
    <section id="markets" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-prose space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Markets
          </h2>
          <p className="text-muted-foreground leading-relaxed sm:text-lg">
            Launch footprint starts in Nairobi, with additional cities queued as fleets and approvals allow.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cities.map((city) => (
            <li
              key={city.name}
              className="flex flex-col justify-between rounded-2xl border border-border px-5 py-4"
            >
              <span className="text-lg font-semibold text-foreground">{city.name}</span>
              <span
                className={
                  city.status === "live"
                    ? "font-mono text-xs text-primary uppercase tracking-wider"
                    : "text-muted-foreground font-mono text-xs uppercase tracking-wider"
                }
              >
                {city.status === "live" ? "Live footprint" : "On roadmap"}
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
