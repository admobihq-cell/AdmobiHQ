import { Container } from "@/components/landing/container"

type LegalPageProps = {
  title: string
  intro: string
  sections: ReadonlyArray<{ heading: string; body: string }>
}

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <div className="border-b border-border py-12 sm:py-20">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{title}</h1>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed">{intro}</p>
        <div className="mt-10 space-y-8">
          {sections.map(({ heading, body }) => (
            <section key={heading}>
              <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">{body}</p>
            </section>
          ))}
        </div>
      </Container>
    </div>
  )
}
