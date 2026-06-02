import { revalidatePath } from "next/cache"
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload"

/**
 * ISR revalidation only works inside a Next.js server context (admin publish, etc.).
 * Seed scripts and Payload CLI run outside Next — skip silently there.
 */
function revalidateHelpPaths(slug?: string | null) {
  try {
    revalidatePath("/help")
    if (slug) {
      revalidatePath(`/help/${slug}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("static generation store missing")) {
      return
    }
    throw error
  }
}

export const revalidateHelpAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  const slug = typeof doc.slug === "string" ? doc.slug : null
  revalidateHelpPaths(slug)
}

export const revalidateHelpAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  const slug = typeof doc.slug === "string" ? doc.slug : null
  revalidateHelpPaths(slug)
}
