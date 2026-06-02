import { revalidatePath } from "next/cache"
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload"

function revalidateBlogPaths(slug?: string | null) {
  try {
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
