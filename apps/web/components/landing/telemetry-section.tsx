import { Container } from "./container"
import { Globe } from "./globe"
import { InView } from "./in-view"

/**
 * The four fields a screen actually transmits, per docs/shared/ROADMAP.md §5:
 * device id, timestamp, GPS fix, screen-on state, and the campaign playing.
 * Values are illustrative — the section shows the shape of a ping, not a live feed.
 */
const pings = [
  {
    label: "Device",
    value: "ADM-0142",
    note: "Taxi-top LED · Nairobi",
    place: "lg:left-0 lg:top-2",
  },
  {
    label: "GPS fix",
    value: "-1.2864, 36.8172",
    note: "Uhuru Highway · ±4 m",
    place: "lg:bottom-6 lg:left-6",
  },
  {
    label: "Screen state",
    value: "On",
    note: "Campaign #4821 · 15s loop",
    place: "lg:right-0 lg:top-2",
  },
  {
    label: "Batch",
    value: "12 samples",
    note: "One upload every minute",
    place: "lg:right-6 lg:bottom-6",
  },
] as const

export function TelemetrySection() {
  // overflow-x-clip: the pinned badges hang past the globe's box on narrow screens.
  return (
    <section
      id="telemetry"
      className="scroll-mt-20 overflow-x-clip border-b border-border py-14 sm:py-20"
    >
      <Container>
        <div className="max-w-2xl space-y-4">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">Proof of play</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Every screen reports back
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
            Each LED unit batches a ping a minute: which device, where it was, whether the screen was
            on, and which campaign was playing. Delivery reports are built from that record, not from
            an estimate of who might have walked past a billboard.
          </p>
        </div>

        <InView className="relative mx-auto mt-12 max-w-[64rem] lg:mt-16">
          <Globe className="mx-auto w-full max-w-[19rem] sm:max-w-[24rem]" />
          <p className="text-muted-foreground mt-4 text-center font-mono text-[0.65rem] uppercase tracking-wider">
            Drag to spin
          </p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:block">
            {pings.map((ping, i) => (
              <li
                key={ping.label}
                className={`anim-rise rounded-lg border border-border bg-background/85 px-4 py-3 backdrop-blur-sm lg:absolute lg:w-[15rem] ${ping.place}`}
                style={{ ["--rise-delay" as string]: `${120 + i * 110}ms` }}
              >
                <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">
                  {ping.label}
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">{ping.value}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{ping.note}</p>
              </li>
            ))}
          </ul>
        </InView>

        <p className="text-muted-foreground mx-auto mt-10 max-w-[64rem] text-xs leading-relaxed lg:mt-14">
          Illustrative ping. The fields shown are the ones a unit transmits; campaign reporting draws
          on the same record.
        </p>
      </Container>
    </section>
  )
}
