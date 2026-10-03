"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Container } from "@/components/landing/container"
import { HelpContactLine } from "@/components/help/help-contact-line"
import { ArticleRow } from "@/components/help/help-index"
import type { HelpArticleListItem, HelpRoleFilter } from "@/lib/payload/types"
import { AUDIENCE_LABELS, HELP_ROLE_FILTERS } from "@/lib/payload/types"
import type { HelpCategory } from "@/payload-types"

type HelpArticleSearchProps = {
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}

const START_HERE_SLUGS = [
  "driver-payouts",
  "driver-signup",
  "creative-formats",
  "launch-timeline",
  "proof-of-play",
  "coverage-nairobi",
] as const

function matchesRole(audience: HelpArticleListItem["category"]["audience"], role: HelpRoleFilter) {
  if (role === "all") {
    return true
  }
  return audience === role || audience === "general"
}

export function HelpArticleSearch({ categories, articles }: HelpArticleSearchProps) {
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<HelpRoleFilter>("all")

  const filteredArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return articles.filter((article) => {
      if (!matchesRole(article.category.audience, role)) {
        return false
      }
      if (!normalized) {
        return true
      }

      const haystack = [
        article.title,
        article.excerpt,
        article.category.title,
        article.category.description ?? "",
        AUDIENCE_LABELS[article.category.audience],
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized)
    })
  }, [articles, query, role])

  const visibleCategories = useMemo(() => {
    return categories.filter((category) => {
      if (!matchesRole(category.audience, role)) {
        return false
      }
      return filteredArticles.some((article) => String(article.category.id) === String(category.id))
    })
  }, [categories, filteredArticles, role])

  const featured = useMemo(() => {
    if (query.trim()) {
      return []
    }
    return filteredArticles
      .filter((article) => article.featured)
      .sort((a, b) => {
        const aRank = START_HERE_SLUGS.indexOf(a.slug as (typeof START_HERE_SLUGS)[number])
        const bRank = START_HERE_SLUGS.indexOf(b.slug as (typeof START_HERE_SLUGS)[number])
        const aOrder = aRank === -1 ? START_HERE_SLUGS.length : aRank
        const bOrder = bRank === -1 ? START_HERE_SLUGS.length : bRank
        return aOrder - bOrder
      })
      .slice(0, 6)
  }, [filteredArticles, query])

  const leadCategory = query.trim() ? null : (visibleCategories[0] ?? null)
  const restCategories = leadCategory
    ? visibleCategories.filter((category) => category.id !== leadCategory.id)
    : visibleCategories

  const searching = query.trim().length > 0
  const hasMiss = searching && filteredArticles.length === 0 && articles.length > 0

  return (
    <>
      <section className="border-border border-b bg-muted/60 py-6 sm:py-8">
        <Container>
          <label className="block">
            <span className="text-foreground mb-2 block text-sm font-medium">Search</span>
            <span className="relative block">
              <Search
                aria-hidden
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search payouts, creative specs, Nairobi corridors…"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 h-12 w-full rounded-lg border pr-4 pl-11 text-base outline-none focus-visible:ring-3 sm:text-sm"
              />
            </span>
          </label>

          <div
            role="radiogroup"
            aria-label="Filter by role"
            className="mt-5 flex flex-wrap gap-2"
          >
            {HELP_ROLE_FILTERS.map((filter) => {
              const selected = role === filter.value
              return (
                <button
                  key={filter.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(filter.value)}
                  className={cn(
                    "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground border-border hover:border-foreground/25 border",
                  )}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </Container>
      </section>

      {articles.length === 0 ? (
        <section className="py-14 sm:py-20">
          <Container>
            <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
              Nothing to show here right now. Check back soon, or contact support if you need help
              in the meantime.
            </p>
            <HelpContactLine className="mt-6" />
          </Container>
        </section>
      ) : null}

      {hasMiss ? (
        <section className="py-14 sm:py-16">
          <Container>
            <p className="text-foreground text-lg font-medium tracking-tight">No guides match.</p>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              Try a shorter phrase, or switch role. If the answer is not in the guides, write to
              the team.
            </p>
            <HelpContactLine className="mt-6" />
          </Container>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="border-border border-b py-12 sm:py-16">
          <Container>
            <div className="max-w-2xl">
              <p className="text-primary font-mono text-[0.65rem] uppercase tracking-[0.18em]">
                Start here
              </p>
              <h2 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                Answers people open first
              </h2>
            </div>
            <ol className="mt-8 max-w-2xl divide-y divide-border border-t border-b border-border">
              {featured.map((article, index) => (
                <li key={article.id}>
                  <ArticleRow
                    href={`/help/${article.slug}`}
                    title={article.title}
                    excerpt={index === 0 ? article.excerpt : undefined}
                    index={index + 1}
                  />
                </li>
              ))}
            </ol>
          </Container>
        </section>
      ) : null}

      {leadCategory ? (
        <CollectionBlock
          category={leadCategory}
          articles={filteredArticles}
          lead
        />
      ) : null}

      {restCategories.length > 0 ? (
        <section className="border-border border-b py-12 sm:py-16">
          <Container>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
              {restCategories.map((category) => (
                <CollectionList
                  key={category.id}
                  category={category}
                  articles={filteredArticles}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {articles.length > 0 && !hasMiss ? (
        <section className="py-10 sm:py-12">
          <Container>
            <HelpContactLine prompt="Cannot find it in these guides?" />
          </Container>
        </section>
      ) : null}
    </>
  )
}

function articlesForCategory(category: HelpCategory, articles: HelpArticleListItem[]) {
  return articles.filter((article) => String(article.category.id) === String(category.id))
}

function CollectionBlock({
  category,
  articles,
  lead,
}: {
  category: HelpCategory
  articles: HelpArticleListItem[]
  lead?: boolean
}) {
  const categoryArticles = articlesForCategory(category, articles)
  if (categoryArticles.length === 0) {
    return null
  }

  return (
    <section className="border-border border-b py-12 sm:py-16">
      <Container>
        <CollectionList category={category} articles={articles} lead={lead} />
      </Container>
    </section>
  )
}

function CollectionList({
  category,
  articles,
  lead = false,
}: {
  category: HelpCategory
  articles: HelpArticleListItem[]
  lead?: boolean
}) {
  const categoryArticles = articlesForCategory(category, articles)
  if (categoryArticles.length === 0) {
    return null
  }

  return (
    <div className={lead ? "max-w-3xl" : undefined}>
      <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-[0.18em]">
        {AUDIENCE_LABELS[category.audience]}
      </p>
      <h2
        id={`collection-${category.slug}`}
        className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
      >
        {category.title}
      </h2>
      {category.description ? (
        <p className="text-muted-foreground mt-2 max-w-[58ch] text-sm leading-relaxed sm:text-base">
          {category.description}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-3 font-mono text-[0.65rem] tabular-nums tracking-wider">
        {categoryArticles.length} {categoryArticles.length === 1 ? "guide" : "guides"}
      </p>
      <ul className="mt-6 divide-y divide-border border-t border-border">
        {categoryArticles.map((article, index) => (
          <li key={article.id}>
            <ArticleRow
              href={`/help/${article.slug}`}
              title={article.title}
              excerpt={lead && index === 0 ? article.excerpt : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
