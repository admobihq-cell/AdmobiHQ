/**
 * The PDF font covers Latin-1 only and the renderer throws on any other codepoint rather than
 * substituting one. Run user-entered text (campaign names, descriptions) through this before
 * it goes into a document. Common typography gets a readable ASCII stand-in; anything else
 * outside Latin-1 (emoji, other scripts) becomes "?".
 */
const STAND_INS: Record<string, string> = {
  "–": "-", // en dash
  "—": "-", // em dash
  "→": "->",
  "←": "<-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "✓": "Yes",
}

export function latin1(value: string | null | undefined): string {
  // Iterate by code point so an emoji (a surrogate pair) becomes one "?", not two.
  return Array.from(value ?? "", (ch) =>
    ch.codePointAt(0)! <= 0xff ? ch : (STAND_INS[ch] ?? "?"),
  ).join("")
}
