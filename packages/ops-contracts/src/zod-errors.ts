// Zod's default messages are written for developers (e.g. "Array must contain
// at least 1 element(s)") and leak straight into ops UI banners if left
// unformatted. This rewrites the common ones into plain, human sentences.
// Schema-authored custom messages (e.g. `.min(1, "Select a fleet type")`)
// already read fine and pass through the fallback unchanged.

const ARRAY_MIN_RE = /^Array must contain at least (\d+) element\(s\)$/
const STRING_MIN_RE = /^String must contain at least (\d+) character\(s\)$/
const STRING_MAX_RE = /^String must contain at most (\d+) character\(s\)$/
const INVALID_ENUM_RE = /^Invalid enum value\./
const INVALID_TYPE_RE = /^Required$|^Expected .+, received (undefined|null)$/

export function humanizeZodMessage(message: string | null | undefined): string {
  const msg = (message ?? "").trim()
  if (!msg) return "This field is invalid."
  if (INVALID_TYPE_RE.test(msg)) return "This field is required."
  if (msg === "Invalid email") return "Enter a valid email address."
  if (INVALID_ENUM_RE.test(msg)) return "Choose a valid option."

  const arrayMin = msg.match(ARRAY_MIN_RE)
  if (arrayMin) {
    const n = Number(arrayMin[1])
    return n <= 1 ? "Select at least one option." : `Select at least ${n} options.`
  }

  const stringMin = msg.match(STRING_MIN_RE)
  if (stringMin) {
    const n = Number(stringMin[1])
    return n <= 1 ? "This field is required." : `Must be at least ${n} characters.`
  }

  const stringMax = msg.match(STRING_MAX_RE)
  if (stringMax) return `Must be at most ${stringMax[1]} characters.`

  return msg
}

export function fieldKeyToLabel(key: string): string {
  const spaced = key.replace(/_/g, " ").trim()
  if (!spaced) return "This field"
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
