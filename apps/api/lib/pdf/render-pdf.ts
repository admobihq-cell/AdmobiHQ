import { render, type RenderOptions } from "takumi-pdf"
import type { ReactElement } from "react"

/** Renders a JSX element tree to PDF bytes via Takumi (no headless
 * browser). Mirrors lib/email/render-template.ts's shape — the one seam
 * that changes if Takumi turns out not to work (see Task 1's go/no-go). */
export async function renderPdf(
  element: ReactElement,
  options: RenderOptions = { size: "a4" },
): Promise<Uint8Array> {
  try {
    return await render(element, options)
  } catch (error) {
    console.error("[PDF] Failed to render document:", error)
    throw error
  }
}
