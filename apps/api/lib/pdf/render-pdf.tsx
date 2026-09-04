import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { ReactElement } from "react"
import { render, type PdfMetadata } from "takumi-pdf"
import { PageNumber, TotalPages } from "takumi-pdf/primitives"

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Approximate sRGB match for this project's --primary token
 * (oklch(0.48 0.14 43)) — PDF rendering needs a literal color, not a CSS
 * variable, so this is duplicated here rather than shared with the web
 * app's token file. Exported for document-shell.tsx and data-table.tsx
 * so every primitive stays on the same brand color. */
export const BRAND_COLOR = "#b45309"
export const BRAND_COLOR_LIGHT = "#fef3e2"

/** Referenced by DocumentShell as <img src={LOGO_SRC} /> — Takumi does
 * not fetch images itself, so the actual bytes are supplied below via
 * the `images` render option, keyed by this same string. */
export const LOGO_SRC = "admobi-logo-mark.png"

let logoBytes: Promise<Uint8Array> | null = null
function getLogoBytes(): Promise<Uint8Array> {
  logoBytes ??= readFile(path.join(dirname, "../../public/brand/logo-mark.png"))
  return logoBytes
}

function DocumentFooter(): ReactElement {
  return (
    <div tw="flex justify-between w-full text-[9px] text-gray-400">
      <span>Admobi · admobihq.com — confidential, internal use only</span>
      <span>
        Page <PageNumber /> of <TotalPages />
      </span>
    </div>
  )
}

/** Renders a JSX element tree to PDF bytes via Takumi (no headless
 * browser). Mirrors lib/email/render-template.ts's shape — the one seam
 * that changes if Takumi turns out not to work (see Task 1's go/no-go).
 * Every document gets A4 sizing, the Admobi logo, and a repeating
 * page-number footer for free — callers only describe body content and,
 * optionally, their own document metadata. */
export async function renderPdf(
  element: ReactElement,
  options: { metadata?: PdfMetadata } = {},
): Promise<Uint8Array> {
  try {
    const data = await getLogoBytes()
    return await render(element, {
      size: "a4",
      footer: <DocumentFooter />,
      images: [{ src: LOGO_SRC, data }],
      metadata: options.metadata,
    })
  } catch (error) {
    console.error("[PDF] Failed to render document:", error)
    throw error
  }
}
