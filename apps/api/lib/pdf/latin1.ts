/**
 * The PDF font covers Latin-1 only and the renderer throws on any other codepoint rather than
 * substituting one. Run user-entered text (campaign names, descriptions) through this before
 * it goes into a document.
 */
export function latin1(value: string | null | undefined): string {
  return (value ?? "").replace(/[^\x00-\xFF]/g, "?")
}
