/**
 * Scanner / exploit paths that must not reach Next.js (Payload, ISR, 404).
 * Edge middleware returns a 404 here — no Node function, no Neon.
 */

const EXACT_PROBE_PATHS = new Set([
  "/about",
  "/about-us",
  "/contact",
  "/contact-us",
  "/contactus",
  "/contacto",
  "/contatti",
  "/get-in-touch",
  "/impressum",
  "/kontakt",
  "/legal",
  "/reach-us",
  "/sobre-nosotros",
  "/support",
  "/team",
  "/login",
  "/signin",
  "/sign-in",
  "/wp-login.php",
  "/xmlrpc.php",
])

const PROBE_PREFIXES = [
  "/wp-admin",
  "/wp-content",
  "/wp-includes",
  "/.git",
  "/.env",
  "/.aws",
  "/phpmyadmin",
  "/phpinfo",
]

function normalizePathname(pathname: string): string {
  const noQuery = pathname.split("?")[0] ?? pathname
  const trimmed = noQuery.replace(/\/+$/, "").toLowerCase()
  return trimmed === "" ? "/" : trimmed
}

export function isProbePath(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (path === "/") return false
  if (EXACT_PROBE_PATHS.has(path)) return true
  if (PROBE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return true
  }
  return path.endsWith(".php") || path.endsWith(".asp") || path.endsWith(".aspx")
}
