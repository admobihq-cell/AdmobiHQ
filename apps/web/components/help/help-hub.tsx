"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, MessageCircleQuestion, Search } from "lucide-react"

import { Container } from "@/components/landing/container"
import { FaqSection } from "@/components/help/faq-section"
import { GuideDirectory, PanelRow } from "@/components/help/guide-directory"
import { HelpContactLine } from "@/components/help/help-contact-line"
import { groupHelpArticles } from "@/components/help/help-shared"
import type { HelpArticleListItem } from "@/lib/payload/types"
import type { HelpCategory } from "@/payload-types"

type HelpHubProps = {
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}

// Deep links into guide sections. A task whose guide or section is missing
// (renamed in the CMS) is dropped rather than rendered as a dead link.
const POPULAR_TASKS = [
  { label: "Create a campaign", slug: "create-a-campaign", section: "build-the-campaign" },
  { label: "Estimate a campaign budget", slug: "create-a-campaign", section: "estimate-the-budget" },
  { label: "Download proof of play", slug: "track-campaigns", section: "download-proof-of-play" },
  { label: "Invite a teammate", slug: "team-and-roles", section: "invite-a-teammate" },
  {
    label: "Complete driver profile setup",
    slug: "driver-account-setup",
    section: "complete-profile-setup",
  },
  {
    label: "Report a safety incident",
    slug: "driver-sos-and-support",
    section: "report-a-safety-incident",
  },
]

type SearchHit = {
  href: string
  title: string
  context: string
}

function searchHelp(articles: HelpArticleListItem[], query: string): SearchHit[] {
  const hits: SearchHit[] = []
  for (const article of articles) {
    const haystack = [article.title, article.excerpt, article.category.title]
      .join(" ")
      .toLowerCase()
    if (haystack.includes(query)) {
      hits.push({ href: `/help/${article.slug}`, title: article.title, context: article.excerpt })
    }
    for (const section of article.sections) {
      if (section.text.toLowerCase().includes(query)) {
        hits.push({
          href: `/help/${article.slug}#${section.id}`,
          title: section.text,
          context: `In: ${article.title}`,
        })
      }
    }
  }
  return hits
}

export function HelpHub({ categories, articles }: HelpHubProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const normalized = query.trim().toLowerCase()

  // "/" jumps to search, unless the visitor is already typing somewhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target?.closest("input, textarea, select, [contenteditable='true']")
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const guideGroups = useMemo(
    () => groupHelpArticles(categories, articles, "guide"),
    [categories, articles],
  )
  const faqGroups = useMemo(
    () => groupHelpArticles(categories, articles, "faq"),
    [categories, articles],
  )
  const faqCount = faqGroups.reduce((total, group) => total + group.articles.length, 0)
  const hits = useMemo(
    () => (normalized ? searchHelp(articles, normalized) : []),
    [articles, normalized],
  )
  const tasks = POPULAR_TASKS.filter((task) =>
    articles.some(
      (article) =>
        article.slug === task.slug &&
        article.sections.some((section) => section.id === task.section),
    ),
  )

  return (
    <>
      <section className="pt-8 sm:pt-12">
        <Container>
          <div className="bg-primary text-primary-foreground selection:bg-primary-foreground selection:text-primary overflow-hidden rounded-3xl">
            <div className="px-5 pt-8 pb-7 sm:px-8 sm:pt-12 sm:pb-9">
              <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
                What do you need help with?
              </h1>
              <label className="relative mt-7 block sm:mt-9">
                <span className="sr-only">Search the help center</span>
                <Search
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2"
                />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search campaigns, payouts, roles…"
                  className="bg-background text-foreground placeholder:text-muted-foreground caret-primary focus-visible:ring-primary-foreground/60 h-16 w-full rounded-2xl pr-16 pl-14 text-base outline-none focus-visible:ring-4 sm:text-lg"
                />
                <kbd
                  aria-hidden
                  className="border-border text-muted-foreground pointer-events-none absolute top-1/2 right-5 hidden size-7 -translate-y-1/2 items-center justify-center rounded-md border font-mono text-xs sm:flex"
                >
                  /
                </kbd>
              </label>
            </div>

            {normalized ? (
              <div className="border-primary-foreground/20 border-t" aria-live="polite">
                {hits.length > 0 ? (
                  <>
                    <p className="text-primary-foreground/80 px-5 pt-6 pb-2 text-sm font-medium tabular-nums sm:px-8">
                      {hits.length} {hits.length === 1 ? "result" : "results"}
                    </p>
                    <ul className="divide-primary-foreground/20 divide-y">
                      {hits.map((hit) => (
                        <li key={hit.href}>
                          <PanelRow href={hit.href} title={hit.title} text={hit.context} />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="px-5 py-8 sm:px-8 sm:py-10">
                    <p className="text-xl font-semibold tracking-tight">Nothing matches that.</p>
                    <p className="text-primary-foreground/80 mt-2 max-w-xl leading-relaxed">
                      Try a shorter phrase, or{" "}
                      <Link
                        href="/help/contact"
                        className="text-primary-foreground focus-visible:ring-primary-foreground rounded-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        write to the team
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <GuideDirectory groups={guideGroups} />
            )}
          </div>

          {faqCount > 0 && !normalized ? (
            <Link
              href="#faq"
              className="group bg-foreground text-background focus-visible:ring-ring mt-4 flex items-center gap-4 rounded-3xl px-5 py-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-8 sm:py-6"
            >
              <span className="bg-background text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
                <MessageCircleQuestion aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-snug font-semibold tracking-tight sm:text-xl">
                  Just have a quick question?
                </span>
                <span className="text-background/75 mt-1 block text-sm leading-relaxed">
                  {faqCount} short answers on campaigns, payouts, fleet installs, and coverage.
                </span>
              </span>
              <span className="bg-background text-foreground flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transform-none">
                <ArrowRight aria-hidden className="size-4" />
              </span>
            </Link>
          ) : null}

          {articles.length === 0 ? (
            <p className="text-muted-foreground mt-8 max-w-xl text-base leading-relaxed">
              Nothing to show here right now. Check back soon, or contact support if you need help
              in the meantime.
            </p>
          ) : null}
        </Container>
      </section>

      {tasks.length > 0 && !normalized ? (
        <section className="pt-14 sm:pt-20">
          <Container>
            <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              Popular tasks
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {tasks.map((task) => (
                <li key={task.label}>
                  <Link
                    href={`/help/${task.slug}#${task.section}`}
                    className="border-border text-foreground hover:border-primary hover:text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full border px-4 text-[0.95rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {task.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {normalized ? null : <FaqSection groups={faqGroups} />}

      <section className="py-10 sm:py-12">
        <Container>
          <HelpContactLine prompt="Didn't find what you needed?" />
        </Container>
      </section>
    </>
  )
}
