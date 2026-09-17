import type { ReactElement, ReactNode } from "react"
import { BRAND_COLOR, LOGO_SRC } from "@/lib/pdf/render-pdf"

/** Page frame every generated document shares: logo, wordmark, title,
 * optional subtitle. The footer (page numbers) is injected once by
 * renderPdf as a repeating per-page footer, not duplicated here. */
export function DocumentShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}): ReactElement {
  return (
    <div tw="flex flex-col w-full h-full p-10 text-[11px] text-gray-800">
      <div
        tw="flex items-center border-b pb-4 mb-6"
        style={{ borderColor: BRAND_COLOR }}
      >
        {/* Source mark is 85x47px — fixed pixel size keeps its aspect ratio */}
        <img src={LOGO_SRC} tw="mr-3" style={{ width: 32, height: 17.7 }} />
        <div tw="flex flex-col">
          <span tw="text-sm font-semibold" style={{ color: BRAND_COLOR }}>
            Admobi
          </span>
          <span tw="text-xl font-semibold mt-1">{title}</span>
          {subtitle ? <span tw="text-xs text-gray-500 mt-1">{subtitle}</span> : null}
        </div>
      </div>
      <div tw="flex-1">{children}</div>
    </div>
  )
}
