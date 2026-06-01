import type { BlogPost, Media } from "@/payload-types"

import { getPayloadClient } from "@/lib/payload/get-payload"
import { isMediaPopulated } from "@/lib/payload/media-url"
import type { BlogPostDoc, BlogPostListItem } from "@/lib/payload/types"

function toListItem(post: BlogPost): BlogPostListItem | null {
  if (!isMediaPopulated(post.featuredImage)) {
    return null
  }

  return {
    id: String(post.id),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featured: Boolean(post.featured),
    topic: post.topic ?? "insights",
    publishedAt: post.publishedAt,
    authorName: post.authorName,
    authorRole: post.authorRole,
    featuredImage: post.featuredImage,
  }
}

export async function getBlogIndexData(): Promise<{
  posts: BlogPostListItem[]
}> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: "blog-posts",
    depth: 1,
    sort: "-publishedAt",
    limit: 100,
    pagination: false,
  })

  const posts = result.docs
    .map(toListItem)
    .filter((post): post is BlogPostListItem => post !== null)

  return { posts }
}

export async function getBlogPostSlugs(): Promise<string[]> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: "blog-posts",
    depth: 0,
    limit: 500,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return result.docs.map((doc) => doc.slug).filter(Boolean)
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostDoc | null> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: "blog-posts",
    depth: 2,
    limit: 1,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const post = result.docs[0]
  if (!post || !isMediaPopulated(post.featuredImage)) {
    return null
  }

  return {
    ...post,
    featuredImage: post.featuredImage,
  }
}

export async function getRelatedBlogPosts(
  post: BlogPostDoc,
  limit = 3,
): Promise<BlogPostListItem[]> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: "blog-posts",
    depth: 1,
    limit: limit + 1,
    sort: "-publishedAt",
    where: {
      and: [
        {
          topic: {
            equals: post.topic ?? "insights",
          },
        },
        {
          id: {
            not_equals: post.id,
          },
        },
      ],
    },
  })

  return result.docs
    .map(toListItem)
    .filter((item): item is BlogPostListItem => item !== null)
    .slice(0, limit)
}
