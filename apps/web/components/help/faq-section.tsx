import { Container } from "@/components/landing/container"
import { ArticleRow, type HelpGroup } from "@/components/help/help-shared"

/** The FAQ block on the help hub: every FAQ category with its questions. Anchored at /help#faq. */
export function FaqSection({ groups }: { groups: HelpGroup[] }) {
  if (groups.length === 0) {
    return null
  }

  return (
    <section id="faq" className="border-border scroll-mt-24 border-b pt-14 sm:pt-20">
      <Container>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Frequently asked questions
        </h2>
        <p className="text-muted-foreground mt-2 max-w-[58ch] text-sm leading-relaxed sm:text-base">
          Short answers on campaigns, payouts, fleet installs, and coverage.
        </p>
        <div className="mt-10 lg:columns-2 lg:gap-x-16">
          {groups.map((group) => (
            <div key={group.category.id} className="mb-12 break-inside-avoid">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                {group.category.title}
              </h3>
              {group.category.description ? (
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {group.category.description}
                </p>
              ) : null}
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {group.articles.map((article) => (
                  <li key={article.id}>
                    <ArticleRow href={`/help/${article.slug}`} title={article.title} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
