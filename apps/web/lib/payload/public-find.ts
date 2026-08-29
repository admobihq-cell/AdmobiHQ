/** Local API bypasses HTTP access control by default. Public pages still
 * must not enter draft mode (that reads cookies/headers and breaks ISR).
 * Filter `_status: published` in `where` so drafts never leak. */
export const PUBLIC_FIND = {
  draft: false,
} as const

export const PUBLISHED_WHERE = {
  _status: {
    equals: "published" as const,
  },
}
