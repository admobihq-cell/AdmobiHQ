/** Basic client-side email shape check (single source of truth for landing forms). */
export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}
