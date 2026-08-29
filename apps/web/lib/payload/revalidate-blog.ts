import { revalidatePath, revalidateTag } from "next/cache"
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload"

import { MARKETING_BLOG_INDEX_TAG, MARKETING_HEADER_POSTS_TAG } from "@/lib/seo/isr"

function revalidateBlogPaths(slug?: string | null) {
  try {
    revalidateTag(MARKETING_HEADER_POSTS_TAG, "max")
    revalidateTag(MARKETING_BLOG_INDEX_TAG, "max")
    revalidatePath("/", "layout")
    revalidatePath("/blog")
    if (slug) {
      revalidatePath(`/blog/${slug}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("static generation store missing")) {
      return
    }
    throw error
  }
}

export const revalidateBlogAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  const slug = typeof doc.slug === "string" ? doc.slug : null
  revalidateBlogPaths(slug)
}

export const revalidateBlogAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  const slug = typeof doc.slug === "string" ? doc.slug : null
  revalidateBlogPaths(slug)
}
