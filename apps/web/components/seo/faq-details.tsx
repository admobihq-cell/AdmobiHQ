import { Container } from "@/components/landing/container"
import type { FaqItem } from "@/lib/seo/faq-data"

type FaqDetailsProps = {
  items: readonly FaqItem[]
  heading: string
}

export function FaqDetails({ items, heading }: FaqDetailsProps) {
  return (
    <section className="border-border border-t py-14 sm:py-20">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
          {heading}
        </h2>
        <div className="mt-8 divide-y divide-border border-t border-border">
          {items.map((item) => (
            <details key={item.q} className="group py-2">
              <summary className="cursor-pointer list-none py-4 text-base font-medium text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    className="text-muted-foreground text-xl font-normal transition-transform duration-200 ease-out group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="text-muted-foreground max-w-[65ch] pb-4 pl-0 text-sm leading-relaxed sm:text-base">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
