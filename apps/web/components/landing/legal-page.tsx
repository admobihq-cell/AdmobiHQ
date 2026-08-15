import { Container } from "@/components/landing/container"
import { GridBackground } from "@/components/landing/grid-background"

type LegalPageProps = {
  title: string
  intro: string
  sections: ReadonlyArray<{ heading: string; body: React.ReactNode }>
}

function slugify(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <div className="relative border-b border-border py-12 sm:py-20">
      <GridBackground />

      <Container className="flex max-w-4xl items-start gap-10">
        <nav className="sticky top-24 hidden w-48 shrink-0 lg:block">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            On this page
          </p>
          <ul className="mt-3 space-y-2 border-l border-border pl-3">
            {sections.map(({ heading }) => (
              <li key={heading}>
                <a
                  href={`#${slugify(heading)}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {title}
          </h1>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">{intro}</p>
          <div className="mt-10 space-y-8">
            {sections.map(({ heading, body }) => (
              <section key={heading} id={slugify(heading)} className="scroll-mt-24">
                <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
                <div className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">
                  {body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </div>
  )
}
