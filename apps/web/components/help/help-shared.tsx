import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import type { HelpArticleListItem } from "@/lib/payload/types"
import type { HelpCategory } from "@/payload-types"

type ArticleRowProps = {
  href: string
  title: string
  excerpt?: string
  index?: number
  className?: string
}

export function ArticleRow({ href, title, excerpt, index, className }: ArticleRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-3 focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {typeof index === "number" ? (
        <span className="text-muted-foreground font-mono text-[0.7rem] tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
      ) : (
        <span
          aria-hidden
          className="text-muted-foreground/70 translate-y-px text-sm transition-colors group-hover:text-primary"
        >
          →
        </span>
      )}
      <span className="min-w-0">
        <span className="text-foreground group-hover:text-primary text-[0.95rem] font-medium tracking-tight transition-colors sm:text-base">
          {title}
        </span>
        {excerpt ? (
          <span className="text-muted-foreground mt-1 block text-sm leading-relaxed">
            {excerpt}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export type HelpGroup = {
  category: HelpCategory
  articles: HelpArticleListItem[]
}

/** Categories of one kind, in sort order, each with its articles. Empty categories are dropped. */
export function groupHelpArticles(
  categories: HelpCategory[],
  articles: HelpArticleListItem[],
  kind: HelpCategory["kind"],
): HelpGroup[] {
  return categories
    .filter((category) => (category.kind === "guide") === (kind === "guide"))
    .map((category) => ({
      category,
      articles: articles.filter((article) => String(article.category.id) === String(category.id)),
    }))
    .filter((group) => group.articles.length > 0)
}
