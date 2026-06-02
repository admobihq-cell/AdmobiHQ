"use client"

import { useMemo, useState } from "react"

import { HelpIndex } from "@/components/help/help-index"
import type { HelpArticleListItem } from "@/lib/payload/types"
import { AUDIENCE_LABELS } from "@/lib/payload/types"
import type { HelpCategory } from "@/payload-types"

type HelpIndexWithSearchProps = {
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}

export function HelpIndexWithSearch({ categories, articles }: HelpIndexWithSearchProps) {
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

  return (
    <HelpIndex
      categories={categories}
      articles={filteredArticles}
      searchSlot={
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
      }
    />
  )
}
