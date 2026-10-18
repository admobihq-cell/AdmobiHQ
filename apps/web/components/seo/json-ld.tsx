function jsonLdScriptId(data: Record<string, unknown>): string {
  const type = String(data["@type"] ?? "schema").toLowerCase()
  const page = String(data.mainEntityOfPage ?? data.url ?? "site")
  const slug = page.replace(/\W+/g, "-").slice(-48) || "root"
  return `jsonld-${type}-${slug}`
}

/** JSON.stringify leaves `<` alone, so CMS text containing `</script>` would
 * close the tag and run whatever follows. `<` is the same character to a
 * JSON parser but not to the HTML tokenizer. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

// A plain server-rendered <script>, not next/script — crawlers that don't
// execute JS (or execute it late) need this present in the initial HTML,
// which next/script's afterInteractive strategy doesn't guarantee.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      id={jsonLdScriptId(data)}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
