import { Container } from "./container"
import { ScatterDotsPattern } from "./pattern-shapes"

const steps = [
  "Brief us on geography, timings, audiences, and brand rules.",
  "Supply creative to internal spec and pass QA for legibility and safe zones.",
  "Schedule fleets, rotations, and publishing windows once everything is cleared.",
  "Go live within agreed periods and tap into reporting as outlined in your plan.",
] as const

export function ProcessSection() {
  return (
    <section
      id="process"
      className="relative scroll-mt-20 border-b border-border py-14 sm:py-20"
    >
      <ScatterDotsPattern className="right-0 left-auto w-1/2" />
      <Container>
        <div className="max-w-xl space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Process
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Transparent steps keep legal, brand, and network teams aligned.
          </p>
        </div>
        <ol className="mt-10 grid gap-6 sm:gap-8">
          {steps.map((text, idx) => (
            <li key={idx} className="flex gap-5 sm:gap-8">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {idx + 1}
              </span>
              <p className="mt-0.5 max-w-[62ch] text-base leading-relaxed text-foreground">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
