import { Container } from "./container"
import { LeadForms } from "./lead-forms"

export function FormsSection() {
  return (
    <section id="get-started" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Get started
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Choose the path that fits. Each form is browser-only for now, ready to connect to your stack.
          </p>
        </div>
        <div className="mt-12">
          <LeadForms />
        </div>
      </Container>
    </section>
  )
}
