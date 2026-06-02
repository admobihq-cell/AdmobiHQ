import Link from "next/link"

import { ArticleCard } from "@/components/help/help-index"
import { LexicalRenderer } from "@/components/help/lexical-renderer"
import { Container } from "@/components/landing/container"
import { JsonLd } from "@/components/seo/json-ld"
import { extractHeadingIds } from "@/lib/payload/lexical-headings"
import type { HelpArticleDoc, HelpArticleListItem } from "@/lib/payload/types"
import { AUDIENCE_LABELS } from "@/lib/payload/types"
import { SITE_NAME, SITE_URL } from "@/lib/seo/site"

type HelpArticleViewProps = {
  article: HelpArticleDoc
  related: HelpArticleListItem[]
}

export function HelpArticleView({ article, related }: HelpArticleViewProps) {
  const headings = extractHeadingIds(article.body)
  const canonical = `${SITE_URL}/help/${article.slug}`
  const updatedAt =
    typeof article.updatedAt === "string" ? article.updatedAt : new Date().toISOString()

  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description: article.excerpt,
    dateModified: updatedAt,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: canonical,
  }

  return (
    <>
      <JsonLd data={techArticleJsonLd} />
      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="border-border border-b py-12 sm:py-16">
          <Container>
            <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/help" className="hover:text-foreground transition-colors">
                    Help
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>{article.category.title}</li>
              </ol>
            </nav>
            <p className="text-muted-foreground mt-6 font-mono text-[0.65rem] uppercase tracking-wider">
              {AUDIENCE_LABELS[article.category.audience]}
            </p>
            <h1 className="text-foreground mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
              {article.title}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
              {article.excerpt}
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Last updated{" "}
              {new Date(updatedAt).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </Container>
        </section>

        <section className="py-12 sm:py-16">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16">
              <article className="max-w-2xl">
                {article.body ? <LexicalRenderer data={article.body} /> : null}
              </article>
              {headings.length > 0 ? (
                <aside className="hidden lg:block">
                  <p className="text-foreground font-mono text-[0.6875rem] font-medium uppercase tracking-[0.17em]">
                    On this page
                  </p>
                  <ul className="mt-4 space-y-2">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className="text-muted-foreground hover:text-foreground text-sm leading-relaxed transition-colors"
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : null}
            </div>
          </Container>
        </section>

        {related.length > 0 ? (
          <section className="border-border border-t py-14 sm:py-20">
            <Container>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Related guides
              </h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <ArticleCard
                    key={item.id}
                    href={`/help/${item.slug}`}
                    title={item.title}
                    excerpt={item.excerpt}
                  />
                ))}
              </div>
            </Container>
          </section>
        ) : null}
      </div>
    </>
  )
}
