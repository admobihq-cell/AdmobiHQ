import { unstable_cache } from "next/cache"

import type { HelpArticle, HelpCategory } from "@/payload-types"

import { getPayloadClient } from "@/lib/payload/get-payload"
import { PUBLIC_FIND, PUBLISHED_WHERE } from "@/lib/payload/public-find"
import { resolvePayloadDatabaseUrl } from "@/lib/resolve-database-url"
import type { HelpArticleDoc, HelpArticleListItem } from "@/lib/payload/types"
import { MARKETING_HELP_INDEX_TAG, MARKETING_REVALIDATE_SECONDS } from "@/lib/seo/isr"

function isCategoryPopulated(
  category: HelpArticle["category"] | HelpCategory,
): category is HelpCategory {
  return typeof category === "object" && category !== null && "title" in category
}

function toListItem(article: HelpArticle): HelpArticleListItem | null {
  if (!isCategoryPopulated(article.category)) {
    return null
  }

  return {
    id: String(article.id),
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    featured: Boolean(article.featured),
    sortOrder: article.sortOrder ?? 0,
    category: article.category,
  }
}

export async function getHelpIndexData(): Promise<{
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}> {
  const payload = await getPayloadClient()

  const [categoriesResult, articlesResult] = await Promise.all([
    payload.find({
      collection: "help-categories",
      sort: "sortOrder",
      limit: 100,
      pagination: false,
      ...PUBLIC_FIND,
    }),
    payload.find({
      collection: "help-articles",
      depth: 1,
      sort: "sortOrder",
      limit: 200,
      pagination: false,
      where: PUBLISHED_WHERE,
      ...PUBLIC_FIND,
    }),
  ])

  const articles = articlesResult.docs
    .map(toListItem)
    .filter((article): article is HelpArticleListItem => article !== null)

  return {
    categories: categoriesResult.docs,
    articles,
  }
}

export function getCachedHelpIndexData(): Promise<{
  categories: HelpCategory[]
  articles: HelpArticleListItem[]
}> {
  return unstable_cache(getHelpIndexData, ["marketing-help-index-v3"], {
    revalidate: MARKETING_REVALIDATE_SECONDS,
    tags: [MARKETING_HELP_INDEX_TAG],
  })()
}

export async function getHelpArticleSlugs(): Promise<string[]> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: "help-articles",
    depth: 0,
    limit: 500,
    pagination: false,
    where: PUBLISHED_WHERE,
    ...PUBLIC_FIND,
    select: {
      slug: true,
    },
  })

  return result.docs.map((doc) => doc.slug).filter(Boolean)
}

export async function getHelpArticleBySlug(slug: string): Promise<HelpArticleDoc | null> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: "help-articles",
    depth: 1,
    limit: 1,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        PUBLISHED_WHERE,
      ],
    },
    ...PUBLIC_FIND,
  })

  const article = result.docs[0]
  if (!article || !isCategoryPopulated(article.category)) {
    return null
  }

  return {
    ...article,
    category: article.category,
  }
}

export async function getRelatedHelpArticles(
  article: HelpArticleDoc,
  limit = 4,
): Promise<HelpArticleListItem[]> {
  const payload = await getPayloadClient()
  const categoryId = article.category.id
  const audience = article.category.audience

  const result = await payload.find({
    collection: "help-articles",
    depth: 1,
    limit: 50,
    pagination: false,
    where: {
      and: [
        {
          id: {
            not_equals: article.id,
          },
        },
        PUBLISHED_WHERE,
      ],
    },
    ...PUBLIC_FIND,
  })

  const items = result.docs
    .map(toListItem)
    .filter((item): item is HelpArticleListItem => item !== null)

  const sameCategory = items.filter((item) => item.category.id === categoryId)
  const sameAudience = items.filter(
    (item) => item.category.id !== categoryId && item.category.audience === audience,
  )

  return [...sameCategory, ...sameAudience].slice(0, limit)
}

export function isPayloadConfigured(): boolean {
  return Boolean(
    resolvePayloadDatabaseUrl()?.trim() && process.env.PAYLOAD_SECRET?.trim(),
  )
}
