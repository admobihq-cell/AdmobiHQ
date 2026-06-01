import { BlogCard } from "@/components/blog/blog-card"
import { Container } from "@/components/landing/container"
import type { BlogPostListItem } from "@/lib/payload/types"

type BlogIndexProps = {
  posts: BlogPostListItem[]
}

export function BlogIndex({ posts }: BlogIndexProps) {
  const featured = posts.filter((post) => post.featured).slice(0, 3)
  const rest = posts.filter((post) => !featured.some((item) => item.id === post.id))

  return (
    <div className="border-b border-border pb-14 sm:pb-20">
      <section className="border-border border-b bg-foreground py-14 text-background sm:py-20">
        <Container>
          <div className="max-w-2xl space-y-4">
            <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
              Blog
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
              Stories from Kenya&apos;s moving media network
            </h1>
            <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed">
              Campaign playbooks, OOH insights, and product updates from the Admobi team — with
              photography from the streets we serve.
            </p>
          </div>
        </Container>
      </section>

      {featured.length > 0 ? (
        <section className="border-border border-b py-14 sm:py-20">
          <Container>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Featured
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="py-14 sm:py-20">
          <Container>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              {featured.length > 0 ? "All articles" : "Articles"}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {posts.length === 0 ? (
        <section className="py-14 sm:py-20">
          <Container>
            <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
              Blog posts will appear here once published in the Payload admin at{" "}
              <code className="text-foreground">/admin</code>. Upload a cover image in{" "}
              <strong className="text-foreground">Media</strong>, create a{" "}
              <strong className="text-foreground">Blog post</strong>, then publish. Run{" "}
              <code className="text-foreground">npm run payload:migrate -w web</code> after pulling
              blog schema changes.
            </p>
          </Container>
        </section>
      ) : null}
    </div>
  )
}
