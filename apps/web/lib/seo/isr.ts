/**
 * Time-based ISR fallback (24h). CMS publish hooks revalidate on demand.
 *
 * Next.js segment config (`export const revalidate` in page/layout files) must
 * be a numeric literal — it cannot import this constant. Keep those exports
 * as `86400` in lockstep with this value.
 */
export const MARKETING_REVALIDATE_SECONDS = 86_400

export const MARKETING_HEADER_POSTS_TAG = "marketing-header-posts"
export const MARKETING_BLOG_INDEX_TAG = "marketing-blog-index"
export const MARKETING_HELP_INDEX_TAG = "marketing-help-index"
