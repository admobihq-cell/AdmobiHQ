import Image from "next/image"
import Link from "next/link"

import { BlogCard } from "@/components/blog/blog-card"
import { LexicalRenderer } from "@/components/help/lexical-renderer"
import { Container } from "@/components/landing/container"
import { JsonLd } from "@/components/seo/json-ld"
import { extractHeadingIds } from "@/lib/payload/lexical-headings"
import { getMediaAlt, getMediaImageSrc, getMediaUrl } from "@/lib/payload/media-url"
import type { BlogPostDoc, BlogPostListItem } from "@/lib/payload/types"
import { BLOG_TOPIC_LABELS } from "@/lib/payload/types"
import { BLOG_PATH, SITE_NAME, SITE_URL, blogAbsoluteUrl } from "@/lib/seo/site"

type BlogPostViewProps = {
  post: BlogPostDoc
  related: BlogPostListItem[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function BlogPostView({ post, related }: BlogPostViewProps) {
  const headings = extractHeadingIds(post.body)
  const canonical = blogAbsoluteUrl(`/${post.slug}`)
  const heroUrl = getMediaImageSrc(post.featuredImage, "hero")
  const heroAbsoluteUrl = getMediaUrl(post.featuredImage, "hero")
  const publishedAt =
    typeof post.publishedAt === "string" ? post.publishedAt : new Date().toISOString()
  const updatedAt =
    typeof post.updatedAt === "string" ? post.updatedAt : publishedAt

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: publishedAt,
    dateModified: updatedAt,
    image: heroAbsoluteUrl ? [heroAbsoluteUrl] : undefined,
    author: {
      "@type": "Person",
      name: post.authorName,
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
      <JsonLd data={blogPostingJsonLd} />
      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="border-border border-b py-12 sm:py-16">
          <Container>
            <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href={BLOG_PATH} className="hover:text-foreground transition-colors">
                    Blog
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>{BLOG_TOPIC_LABELS[post.topic ?? "insights"]}</li>
              </ol>
            </nav>
            <p className="text-muted-foreground mt-6 font-mono text-[0.65rem] uppercase tracking-wider">
              {formatDate(publishedAt)}
            </p>
            <h1 className="text-foreground mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
              {post.title}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
              {post.excerpt}
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              By <span className="text-foreground">{post.authorName}</span>
              {post.authorRole ? ` · ${post.authorRole}` : ""}
            </p>
          </Container>
        </section>

        {heroUrl ? (
          <section className="border-border border-b">
            <Container className="py-8 sm:py-10">
              <div className="relative aspect-[16/9] max-h-[32rem] w-full overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={heroUrl}
                  alt={getMediaAlt(post.featuredImage)}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1152px"
                />
              </div>
            </Container>
          </section>
        ) : null}

        <section className="py-12 sm:py-16">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16">
              <article className="max-w-2xl">
                {post.body ? <LexicalRenderer data={post.body} /> : null}
              </article>
              {headings.length > 0 ? (
                <aside className="hidden lg:block">
                  <p className="text-foreground font-mono text-[0.6875rem] font-medium uppercase tracking-[0.17em]">
                    On this page
                  </p>
                  <ul className="mt-4 space-y-2">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className="text-muted-foreground hover:text-foreground text-sm leading-relaxed transition-colors"
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : null}
            </div>
          </Container>
        </section>

        {related.length > 0 ? (
          <section className="border-border border-t py-14 sm:py-20">
            <Container>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Related articles
              </h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <BlogCard key={item.id} post={item} />
                ))}
              </div>
            </Container>
          </section>
        ) : null}
      </div>
    </>
  )
}
