import Image from "next/image"
import Link from "next/link"

import { getMediaAlt, getMediaImageSrc } from "@/lib/payload/media-url"
import type { BlogPostListItem } from "@/lib/payload/types"
import { BLOG_TOPIC_LABELS } from "@/lib/payload/types"

type BlogCardProps = {
  post: BlogPostListItem
}

export function BlogCard({ post }: BlogCardProps) {
  const imageUrl = getMediaImageSrc(post.featuredImage, "card")
  const published = new Date(post.publishedAt).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/20"
    >
      {imageUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={getMediaAlt(post.featuredImage)}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">
          {BLOG_TOPIC_LABELS[post.topic]} · {published}
        </p>
        <h3 className="text-foreground text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
        <p className="text-muted-foreground mt-auto text-sm">
          {post.authorName}
          {post.authorRole ? ` · ${post.authorRole}` : ""}
        </p>
      </div>
    </Link>
  )
}
