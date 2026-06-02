import type { Metadata } from "next"

import { BlogIndex } from "@/components/blog/blog-index"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { getBlogIndexData } from "@/lib/payload/blog-queries"
import { isPayloadConfigured } from "@/lib/payload/help-queries"
import { blogPageMetadata } from "@/lib/seo/site"

export const revalidate = 3600

export const metadata: Metadata = blogPageMetadata({
  title: "Blog — taxi-top OOH insights & campaigns | Admobi Kenya",
  description:
    "Articles on digital out-of-home, taxi-top LED campaigns, and Admobi product updates from Nairobi and Kenya.",
})

export default async function BlogPage() {
  const data = isPayloadConfigured()
    ? await getBlogIndexData().catch((error) => {
        console.error("[blog] Failed to load posts:", error)
        return { posts: [] }
      })
    : { posts: [] }

  return (
    <>
      <MarketingPageJsonLd
        path="/blog"
        name="Blog"
        description="Articles on digital OOH, taxi-top campaigns, and Admobi updates in Kenya."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]}
      />
      <BlogIndex posts={data.posts} />
    </>
  )
}
