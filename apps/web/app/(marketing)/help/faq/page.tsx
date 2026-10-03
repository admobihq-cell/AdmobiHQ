import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { ArrowRight, Plus } from "lucide-react"

import { HelpContactLine } from "@/components/help/help-contact-line"
import { groupHelpArticles, HELP_AUDIENCES } from "@/components/help/help-shared"
import { Container } from "@/components/landing/container"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { getCachedHelpIndexData, isPayloadConfigured } from "@/lib/payload/help-queries"
import { pageMetadata } from "@/lib/seo/site"

export const revalidate = 86400

export const metadata: Metadata = pageMetadata({
  title: "Frequently asked questions | Admobi Help",
  description:
    "Short answers for advertisers, drivers, and fleet partners on campaigns, payouts, installs, and coverage.",
  path: "/help/faq",
})

const LINK_FOCUS =
  "focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"

/**
 * Every FAQ answer in one place, grouped by audience then category. Each
 * question opens to its short answer; the full article is one link further.
 */
export default async function HelpFaqPage() {
  const data = isPayloadConfigured()
    ? await getCachedHelpIndexData().catch((error) => {
        console.error("[help] Failed to load FAQ:", error)
        noStore()
        return { categories: [], articles: [] }
      })
    : { categories: [], articles: [] }

  const groups = groupHelpArticles(data.categories, data.articles, "faq")
  if (groups.length === 0) {
    noStore()
  }

  const audiences = HELP_AUDIENCES.map((audience) => {
    const audienceGroups = groups.filter((group) => group.category.audience === audience.value)
    return {
      ...audience,
      groups: audienceGroups,
      count: audienceGroups.reduce((total, group) => total + group.articles.length, 0),
    }
  }).filter((audience) => audience.count > 0)

  return (
    <>
      <MarketingPageJsonLd
        path="/help/faq"
        name="Frequently asked questions"
        description="Short answers for advertisers, drivers, and fleet partners."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "FAQ", path: "/help/faq" },
        ]}
        faqItems={groups.flatMap((group) =>
          group.articles.map((article) => ({ q: article.title, a: article.excerpt })),
        )}
      />
      <section className="border-border border-b pt-10 pb-16 sm:pt-14 sm:pb-24">
        <Container>
          <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
            <Link
              href="/help"
              className={`hover:text-foreground transition-colors ${LINK_FOCUS}`}
            >
              Help center
            </Link>
          </nav>
          <h1 className="text-foreground mt-5 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[58ch] text-lg leading-relaxed">
            Short answers on campaigns, payouts, fleet installs, and coverage. Open a question to
            read the answer.
          </p>

          {audiences.length > 0 ? (
            <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
              <nav aria-label="Jump to audience" className="lg:sticky lg:top-28 lg:self-start">
                <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                  {audiences.map((audience) => (
                    <li key={audience.value}>
                      <a
                        href={`#${audience.value}`}
                        className={`border-border text-foreground hover:border-foreground/40 lg:hover:bg-muted/70 flex min-h-11 items-center justify-between gap-3 rounded-full border px-4 text-sm font-medium transition-colors lg:rounded-xl lg:border-0 lg:px-3 ${LINK_FOCUS}`}
                      >
                        {audience.label}
                        <span className="text-muted-foreground tabular-nums">{audience.count}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="max-w-3xl space-y-16">
                {audiences.map((audience) => (
                  <section
                    key={audience.value}
                    id={audience.value}
                    aria-labelledby={`${audience.value}-heading`}
                    className="scroll-mt-28"
                  >
                    <h2
                      id={`${audience.value}-heading`}
                      className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
                    >
                      {audience.label}
                    </h2>
                    <div className="mt-6 space-y-10">
                      {audience.groups.map((group) => (
                        <div key={group.category.id}>
                          <h3 className="text-muted-foreground text-sm font-medium">
                            {group.category.title}
                          </h3>
                          <div className="divide-border border-border mt-3 divide-y border-y">
                            {group.articles.map((article) => (
                              <details key={article.id} className="group">
                                <summary
                                  className={`text-foreground hover:text-primary flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.0625rem] font-medium tracking-tight transition-colors [&::-webkit-details-marker]:hidden ${LINK_FOCUS}`}
                                >
                                  {article.title}
                                  <Plus
                                    aria-hidden
                                    className="text-muted-foreground size-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-45 motion-reduce:transition-none"
                                  />
                                </summary>
                                <div className="pr-9 pb-5">
                                  <p className="text-muted-foreground max-w-[65ch] leading-relaxed">
                                    {article.excerpt}
                                  </p>
                                  <Link
                                    href={`/help/${article.slug}`}
                                    className={`text-primary mt-3 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline ${LINK_FOCUS}`}
                                  >
                                    Read the full answer
                                    <ArrowRight aria-hidden className="size-4" />
                                  </Link>
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                <HelpContactLine prompt="Didn't find what you needed?" />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground mt-10 max-w-xl leading-relaxed">
              Nothing to show here right now.
            </p>
          )}
        </Container>
      </section>
    </>
  )
}
