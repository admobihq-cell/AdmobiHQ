import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import { HelpContactLine } from "@/components/help/help-contact-line"
import { ArticleRow, groupHelpArticles, type HelpGroup } from "@/components/help/help-shared"
import { LexicalRenderer } from "@/components/help/lexical-renderer"
import { Container } from "@/components/landing/container"
import { JsonLd } from "@/components/seo/json-ld"
import { extractHeadingIds } from "@/lib/payload/lexical-headings"
import { breadcrumbListJsonLd } from "@/lib/seo/schema"
import type { HelpArticleDoc, HelpArticleListItem } from "@/lib/payload/types"
import { SITE_NAME, SITE_URL } from "@/lib/seo/site"
import type { HelpCategory } from "@/payload-types"

type HelpArticleViewProps = {
  article: HelpArticleDoc
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}

const LINK_FOCUS =
  "focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"

const EYEBROW = "text-foreground font-mono text-[0.6875rem] font-medium uppercase tracking-[0.17em]"

// Numbered lists render as step markers and quotes as boxed callouts. Scoped
// here rather than in LexicalRenderer, which the blog shares.
const GUIDE_BODY = cn(
  "[&_ol]:list-none [&_ol]:pl-0 [&_ol]:[counter-reset:step]",
  "[&_ol>li]:relative [&_ol>li]:my-5 [&_ol>li]:pl-11 [&_ol>li]:[counter-increment:step]",
  "[&_ol>li]:before:bg-primary [&_ol>li]:before:text-primary-foreground [&_ol>li]:before:absolute [&_ol>li]:before:top-0 [&_ol>li]:before:left-0 [&_ol>li]:before:flex [&_ol>li]:before:size-7 [&_ol>li]:before:items-center [&_ol>li]:before:justify-center [&_ol>li]:before:rounded-full [&_ol>li]:before:font-mono [&_ol>li]:before:text-xs [&_ol>li]:before:font-medium [&_ol>li]:before:content-[counter(step)]",
  "[&_blockquote]:border-border [&_blockquote]:bg-muted/60 [&_blockquote]:text-muted-foreground [&_blockquote]:my-8 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-[0.95rem] [&_blockquote]:leading-relaxed [&_blockquote]:font-normal [&_blockquote]:not-italic",
  "[&_strong]:text-foreground",
)

export function HelpArticleView({ article, categories, articles }: HelpArticleViewProps) {
  const headings = extractHeadingIds(article.body)
  const canonical = `${SITE_URL}/help/${article.slug}`
  const updatedAt =
    typeof article.updatedAt === "string" ? article.updatedAt : new Date().toISOString()

  const isGuide = article.category.kind === "guide"
  const guideGroups = groupHelpArticles(categories, articles, "guide")
  const faqs = groupHelpArticles(categories, articles, "faq").flatMap((group) => group.articles)

  // Guides page through the sidebar order; FAQ answers page through the FAQ list.
  const sequence = isGuide ? guideGroups.flatMap((group) => group.articles) : faqs
  const position = sequence.findIndex((item) => item.slug === article.slug)
  const previous = position > 0 ? sequence[position - 1] : null
  const next = position >= 0 ? (sequence[position + 1] ?? null) : null

  // A guide lists the FAQ answers written for the same audience; an FAQ answer
  // lists the rest of its own category.
  const questions = faqs
    .filter((item) =>
      isGuide
        ? item.category.audience === article.category.audience
        : item.category.id === article.category.id && item.slug !== article.slug,
    )
    .slice(0, 6)

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

  const nav = <HelpNav groups={guideGroups} currentSlug={article.slug} faqCurrent={!isGuide} />

  return (
    <>
      <JsonLd data={techArticleJsonLd} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          ...(isGuide ? [] : [{ name: "FAQ", path: "/help/faq" }]),
          { name: article.title, path:  },
        ])}
      />
      <div className="border-border border-b py-8 sm:py-12">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[13rem_minmax(0,1fr)_12rem]">
            <details className="border-border rounded-lg border lg:hidden">
              <summary
                className={cn(
                  "text-foreground cursor-pointer px-4 py-3 text-sm font-medium",
                  LINK_FOCUS,
                )}
              >
                Browse help
              </summary>
              <div className="border-border border-t px-4 py-4">{nav}</div>
            </details>
            <aside className="hidden lg:block">
              <div className="sticky top-28">{nav}</div>
            </aside>

            <article className="min-w-0 max-w-[68ch]">
              <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
                <ol className="flex flex-wrap items-center gap-2">
                  <li>
                    <Link
                      href="/help"
                      className={cn("hover:text-foreground transition-colors", LINK_FOCUS)}
                    >
                      Help center
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  {isGuide ? (
                    <li>{article.category.title}</li>
                  ) : (
                    <li>
                      <Link
                        href="/help/faq"
                        className={cn("hover:text-foreground transition-colors", LINK_FOCUS)}
                      >
                        Frequently asked questions
                      </Link>
                    </li>
                  )}
                </ol>
              </nav>
              <h1 className="text-foreground mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.1]">
                {article.title}
              </h1>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
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

              <div className={cn("border-border mt-8 border-t pt-2", GUIDE_BODY)}>
                {article.body ? <LexicalRenderer data={article.body} /> : null}
              </div>

              {questions.length > 0 ? (
                <section className="mt-14">
                  <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                    {isGuide ? "Frequently asked questions" : "Related questions"}
                  </h2>
                  <ul className="mt-4 divide-y divide-border border-t border-b border-border">
                    {questions.map((item) => (
                      <li key={item.id}>
                        <ArticleRow href={`/help/${item.slug}`} title={item.title} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {previous || next ? (
                <nav
                  aria-label="More help"
                  className="border-border mt-14 grid gap-4 border-t pt-8 sm:grid-cols-2"
                >
                  {previous ? <PagerLink label="Previous" item={previous} /> : <span />}
                  {next ? <PagerLink label="Next" item={next} alignEnd /> : null}
                </nav>
              ) : null}

              <HelpContactLine className="mt-10" prompt="Didn't find what you needed?" />
            </article>

            {headings.length > 0 ? (
              <aside className="hidden xl:block">
                <div className="sticky top-28">
                  <p className={EYEBROW}>On this page</p>
                  <ul className="mt-4 space-y-2">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className={cn(
                            "text-muted-foreground hover:text-foreground text-sm leading-relaxed transition-colors",
                            LINK_FOCUS,
                          )}
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
      </div>
    </>
  )
}

function HelpNav({
  groups,
  currentSlug,
  faqCurrent,
}: {
  groups: HelpGroup[]
  currentSlug: string
  faqCurrent: boolean
}) {
  return (
    <nav aria-label="Help center" className="space-y-7">
      {groups.map((group) => (
        <div key={group.category.id}>
          <p className={EYEBROW}>{group.category.title}</p>
          <ul className="mt-3 space-y-1">
            {group.articles.map((item) => (
              <li key={item.id}>
                <NavLink href={`/help/${item.slug}`} current={item.slug === currentSlug}>
                  {item.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <p className={EYEBROW}>Support</p>
        <ul className="mt-3 space-y-1">
          <li>
            <NavLink href="/help/faq" current={faqCurrent}>
              Frequently asked questions
            </NavLink>
          </li>
          <li>
            <NavLink href="/help/contact" current={false}>
              Contact support
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string
  current: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "-ml-3 block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors",
        LINK_FOCUS,
        current
          ? "border-primary text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {children}
    </Link>
  )
}

function PagerLink({
  label,
  item,
  alignEnd,
}: {
  label: string
  item: HelpArticleListItem
  alignEnd?: boolean
}) {
  return (
    <Link
      href={`/help/${item.slug}`}
      className={cn(
        "group border-border hover:border-primary/50 flex flex-col rounded-xl border p-4 transition-colors",
        LINK_FOCUS,
        alignEnd && "sm:items-end sm:text-right",
      )}
    >
      <span className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-[0.18em]">
        {label}
      </span>
      <span className="text-foreground group-hover:text-primary mt-1 text-sm font-medium tracking-tight transition-colors">
        {item.title}
      </span>
    </Link>
  )
}
