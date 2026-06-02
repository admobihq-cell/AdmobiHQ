import Script from "next/script"

function jsonLdScriptId(data: Record<string, unknown>): string {
  const type = String(data["@type"] ?? "schema").toLowerCase()
  const page = String(data.mainEntityOfPage ?? data.url ?? "site")
  const slug = page.replace(/\W+/g, "-").slice(-48) || "root"
  return `jsonld-${type}-${slug}`
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <Script
      id={jsonLdScriptId(data)}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
