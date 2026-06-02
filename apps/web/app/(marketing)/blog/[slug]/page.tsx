import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { BlogPostView } from "@/components/blog/blog-post"
import {
  getBlogPostBySlug,
  getBlogPostSlugs,
  getRelatedBlogPosts,
} from "@/lib/payload/blog-queries"
import { getMediaAlt, getMediaUrl } from "@/lib/payload/media-url"
import { isPayloadConfigured } from "@/lib/payload/help-queries"
import { blogPageMetadata } from "@/lib/seo/site"

export const revalidate = 3600

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  if (!isPayloadConfigured()) {
    return []
  }

  try {
    const slugs = await getBlogPostSlugs()
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

  const post = await getBlogPostBySlug(slug).catch(() => null)
  if (!post) {
    return {}
  }

  const title = post.seoTitle ?? `${post.title} | Admobi Blog`
  const description = post.seoDescription ?? post.excerpt
  const ogImage = getMediaUrl(post.featuredImage, "card")

  const base = blogPageMetadata({
    title,
    description,
    slug,
  })

  if (!ogImage) {
    return base
  }

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime:
        typeof post.updatedAt === "string" ? post.updatedAt : post.publishedAt,
      authors: [post.authorName],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: getMediaAlt(post.featuredImage),
        },
      ],
    },
    twitter: {
      ...base.twitter,
      images: [ogImage],
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params

  if (!isPayloadConfigured()) {
    notFound()
  }

  const post = await getBlogPostBySlug(slug).catch(() => null)
  if (!post) {
    notFound()
  }

  const related = await getRelatedBlogPosts(post).catch(() => [])

  return <BlogPostView post={post} related={related} />
}
