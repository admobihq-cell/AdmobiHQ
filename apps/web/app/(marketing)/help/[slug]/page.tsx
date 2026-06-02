import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { HelpArticleView } from "@/components/help/help-article"
import {
  getHelpArticleBySlug,
  getHelpArticleSlugs,
  getRelatedHelpArticles,
  isPayloadConfigured,
} from "@/lib/payload/help-queries"
import { pageMetadata } from "@/lib/seo/site"

export const revalidate = 3600

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  if (!isPayloadConfigured()) {
    return []
  }

  try {
    const slugs = await getHelpArticleSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  if (!isPayloadConfigured()) {
    return {}
  }

  const article = await getHelpArticleBySlug(slug).catch(() => null)
  if (!article) {
    return {}
  }

  const title = article.seoTitle ?? `${article.title} | Admobi Help`
  const description = article.seoDescription ?? article.excerpt

  return pageMetadata({
    title,
    description,
    path: `/help/${slug}`,
  })
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params

  if (!isPayloadConfigured()) {
    notFound()
  }

  const article = await getHelpArticleBySlug(slug).catch(() => null)
  if (!article) {
    notFound()
  }

  const related = await getRelatedHelpArticles(article).catch(() => [])

  return <HelpArticleView article={article} related={related} />
}
