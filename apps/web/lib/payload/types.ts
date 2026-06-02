import type { HelpArticle, HelpCategory } from "@/payload-types"

export type HelpAudience = HelpCategory["audience"]

export const AUDIENCE_LABELS: Record<HelpAudience, string> = {
  advertiser: "For advertisers",
  driver: "For drivers",
  fleet: "For fleet partners",
  general: "General",
}

export type HelpCategoryDoc = HelpCategory

export type HelpArticleListItem = {
  id: string
  title: string
  slug: string
  excerpt: string
  featured: boolean
  sortOrder: number
  category: HelpCategoryDoc
}

export type HelpArticleDoc = HelpArticle & {
  category: HelpCategoryDoc
}

export type BlogTopic = NonNullable<import("@/payload-types").BlogPost["topic"]>

export const BLOG_TOPIC_LABELS: Record<BlogTopic, string> = {
  ooh: "OOH & media",
  campaigns: "Campaigns",
  product: "Product",
  company: "Company",
  insights: "Insights",
}

export type BlogPostListItem = {
  id: string
  title: string
  slug: string
  excerpt: string
  featured: boolean
  topic: BlogTopic
  publishedAt: string
  authorName: string
  authorRole?: string | null
  /** Populated at depth ≥ 1; list cards render without an image when missing. */
  featuredImage: import("@/payload-types").Media | null
}

export type BlogPostDoc = import("@/payload-types").BlogPost & {
  featuredImage: import("@/payload-types").Media | null
}
