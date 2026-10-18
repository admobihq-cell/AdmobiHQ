/**
 * Narrows a `?redirect_url=` value to a same-origin path, or "/".
 *
 * `startsWith("/")` alone is not enough: `//evil.com` and `/\evil.com` both
 * start with a slash, and browsers resolve them as protocol-relative URLs to
 * another host — an open redirect straight after a successful sign-in.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/"
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/"
  // Tabs/newlines are stripped by URL parsers, so "/\t/evil.com" becomes "//evil.com".
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return "/"
  }
  return raw
}
