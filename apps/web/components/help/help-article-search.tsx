"use client"

import { useMemo, useState } from "react"

import { Container } from "@/components/landing/container"
import { ArticleCard } from "@/components/help/help-index"
import type { HelpArticleListItem } from "@/lib/payload/types"
import { AUDIENCE_LABELS } from "@/lib/payload/types"
import type { HelpCategory } from "@/payload-types"

type HelpArticleSearchProps = {
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}

export function HelpArticleSearch({ categories, articles }: HelpArticleSearchProps) {
  const [query, setQuery] = useState("")

  const filteredArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return articles
    }

    return articles.filter((article) => {
      const haystack = [
        article.title,
        article.excerpt,
        article.category.title,
        AUDIENCE_LABELS[article.category.audience],
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized)
    })
  }, [articles, query])

  const featured = filteredArticles.filter((article) => article.featured).slice(0, 3)

  return (
    <>
      <section className="border-border border-b py-8 sm:py-10">
        <Container>
          <label className="block max-w-xl">
            <span className="sr-only">Search help articles</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guides…"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </Container>
      </section>

      {featured.length > 0 ? (
        <section className="border-border border-b py-14 sm:py-20">
          <Container>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Featured guides
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <ArticleCard
                  key={article.id}
                  href={`/help/${article.slug}`}
                  title={article.title}
                  excerpt={article.excerpt}
                  meta={AUDIENCE_LABELS[article.category.audience]}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {categories.map((category) => {
        const categoryArticles = filteredArticles.filter((article) => {
          const categoryId =
            typeof article.category === "object" && article.category !== null
              ? article.category.id
              : article.category
          return categoryId != null && String(categoryId) === String(category.id)
        })

        if (categoryArticles.length === 0) {
          return null
        }

        return (
          <section key={category.id} className="border-border border-b py-14 sm:py-20">
            <Container>
              <div className="max-w-2xl space-y-3">
                <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">
                  {AUDIENCE_LABELS[category.audience]}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                  {category.title}
                </h2>
                {category.description ? (
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {category.description}
                  </p>
                ) : null}
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {categoryArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    href={`/help/${article.slug}`}
                    title={article.title}
                    excerpt={article.excerpt}
                  />
                ))}
              </div>
            </Container>
          </section>
        )
      })}

      {articles.length === 0 ? (
        <section className="py-14 sm:py-20">
          <Container>
            <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
              No published help articles yet. In <code className="text-foreground">/admin</code>,
              open each article and click <strong className="text-foreground">Publish</strong>{" "}
              (drafts show in admin but not on this page). Run{" "}
              <code className="text-foreground">npm run seed:help -w web</code> against the same{" "}
              <code className="text-foreground">DATABASE_URL</code> as this deployment, or wait up
              to an hour if the preview was built before content existed.
            </p>
          </Container>
        </section>
      ) : null}
    </>
  )
}
