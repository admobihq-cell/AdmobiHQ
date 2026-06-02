import Link from "next/link"
import type { ReactNode } from "react"

import { Container } from "@/components/landing/container"
import type { HelpArticleListItem } from "@/lib/payload/types"
import { AUDIENCE_LABELS } from "@/lib/payload/types"
import type { HelpCategory } from "@/payload-types"

type ArticleCardProps = {
  href: string
  title: string
  excerpt: string
  meta?: string
}

export function ArticleCard({ href, title, excerpt, meta }: ArticleCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
    >
      {meta ? (
        <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">
          {meta}
        </p>
      ) : null}
      <h3 className="text-foreground text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{excerpt}</p>
    </Link>
  )
}

type HelpIndexProps = {
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
  searchSlot?: ReactNode
}

export function HelpIndex({ categories, articles, searchSlot }: HelpIndexProps) {
  const featured = articles.filter((article) => article.featured).slice(0, 3)

  return (
    <div className="border-b border-border pb-14 sm:pb-20">
      <section className="border-border border-b bg-foreground py-14 text-background sm:py-20">
        <Container>
          <div className="max-w-2xl space-y-4">
            <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
              Help center
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
              Guides and answers for Admobi in Kenya
            </h1>
            <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed">
              Campaign setup, driver onboarding, fleet partnerships, and Nairobi rollout — all in
              one place.
            </p>
          </div>
        </Container>
      </section>

      {searchSlot ? (
        <section className="border-border border-b py-8 sm:py-10">
          <Container>{searchSlot}</Container>
        </section>
      ) : null}

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
        const categoryArticles = articles.filter((article) => {
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
    </div>
  )
}
