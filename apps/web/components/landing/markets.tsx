import { Container } from "./container"
import { cn } from "@workspace/ui/lib/utils"

const cities = [
  { name: "Nairobi", status: "live" as const },
  { name: "Nakuru", status: "coming" as const },
  { name: "Eldoret", status: "coming" as const },
  { name: "Mombasa", status: "coming" as const },
] as const

function StopStatus({ status }: { status: (typeof cities)[number]["status"] }) {
  const isLive = status === "live"
  return (
    <span
      className={cn(
        "mt-2 inline-block rounded-full border border-border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider",
        isLive ? "border-primary/40 bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground",
      )}
    >
      {isLive ? "Live" : "Coming soon"}
    </span>
  )
}

export function MarketsSection() {
  return (
    <section id="markets" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-[68ch] space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Kenya rollout
          </h2>
          <p className="text-muted-foreground leading-relaxed sm:text-lg">
            Our digital taxi-top and delivery-bike screen network is live in Nairobi, with Nakuru,
            Eldoret, and Mombasa next in line, plus more Kenyan cities as fleet footprint grows. When
            you need scale beyond a single market, we coordinate multi-city flights and Kenya-wide
            bursts under one brief.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Campaigns start from one day: no long-term commitment required.
          </p>
        </div>

        {/* Mobile: vertical route */}
        <ol className="mt-12 flex flex-col lg:hidden">
          {cities.map((city, i) => (
            <li key={city.name} className="flex gap-4">
              <div className="flex w-9 shrink-0 flex-col items-center pt-1">
                <span
                  className="bg-primary z-10 size-2.5 shrink-0 rounded-full ring-4 ring-background"
                  aria-hidden
                />
                {i < cities.length - 1 ? (
                  <span className="mt-1 min-h-12 w-px border-l border-dashed border-border" aria-hidden />
                ) : null}
              </div>
              <div className={cn("min-w-0 pb-8", i === cities.length - 1 && "pb-0")}>
                <p className="text-lg font-semibold text-foreground">{city.name}</p>
                <StopStatus status={city.status} />
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop: horizontal corridor */}
        <div className="relative mt-14 hidden lg:block">
          <div
            className="pointer-events-none absolute left-[8%] right-[8%] top-[5px] border-t border-dashed border-border"
            aria-hidden
          />
          <ol className="relative flex justify-between gap-2">
            {cities.map((city) => (
              <li
                key={city.name}
                className="flex max-w-[22%] flex-1 flex-col items-center text-center"
              >
                <span
                  className="bg-primary z-10 mb-4 size-2.5 shrink-0 rounded-full ring-4 ring-background"
                  aria-hidden
                />
                <p className="text-lg font-semibold text-foreground">{city.name}</p>
                <StopStatus status={city.status} />
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  )
}
