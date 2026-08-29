import Link from "next/link"

import { HelpContactLine } from "@/components/help/help-contact-line"
import { ArticleRow } from "@/components/help/help-index"
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
      <div className="border-b border-border">
        <section className="border-border border-b py-10 sm:py-14">
          <Container>
            <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link
                    href="/help"
                    className="hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Help
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>{article.category.title}</li>
              </ol>
            </nav>
            <p className="text-primary mt-6 font-mono text-[0.65rem] uppercase tracking-[0.18em]">
              {AUDIENCE_LABELS[article.category.audience]}
            </p>
            <h1 className="text-foreground mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
              {article.title}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-[65ch] text-base leading-relaxed sm:text-lg">
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
              <article className="max-w-[65ch]">
                {article.body ? <LexicalRenderer data={article.body} /> : null}
                <div className="border-border mt-12 border-t pt-8">
                  <HelpContactLine />
                </div>
              </article>
              {headings.length > 0 ? (
                <aside className="hidden lg:block">
                  <div className="sticky top-28">
                    <p className="text-foreground font-mono text-[0.6875rem] font-medium uppercase tracking-[0.17em]">
                      On this page
                    </p>
                    <ul className="mt-4 space-y-2">
                      {headings.map((heading) => (
                        <li key={heading.id}>
                          <a
                            href={`#${heading.id}`}
                            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm leading-relaxed transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              ) : null}
            </div>
          </Container>
        </section>

        {related.length > 0 ? (
          <section className="border-border border-t py-12 sm:py-16">
            <Container>
              <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                Related guides
              </h2>
              <ul className="mt-6 max-w-2xl divide-y divide-border border-t border-b border-border">
                {related.map((item) => (
                  <li key={item.id}>
                    <ArticleRow href={`/help/${item.slug}`} title={item.title} />
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        ) : null}
      </div>
    </>
  )
}
