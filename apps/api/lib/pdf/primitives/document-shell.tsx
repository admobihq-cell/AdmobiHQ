import type { ReactElement, ReactNode } from "react"

/** Approximate sRGB match for this project's --primary token
 * (oklch(0.48 0.14 43)) — PDF rendering needs a literal color, not a CSS
 * variable, so this is duplicated here rather than shared with the web
 * app's token file. */
const BRAND_COLOR = "#b45309"

/** Page frame every generated document shares: wordmark, title, optional
 * subtitle, and a footer. No logo image — Takumi doesn't fetch remote
 * images itself (pre-fetched bytes only, confirmed in Task 1), and an
 * ops export doesn't need branding polish; revisit when a customer-facing
 * document needs it. */
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
      <div tw="flex flex-col border-b pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
        <span tw="text-sm font-semibold" style={{ color: BRAND_COLOR }}>
          Admobi
        </span>
        <span tw="text-xl font-semibold mt-1">{title}</span>
        {subtitle ? <span tw="text-xs text-gray-500 mt-1">{subtitle}</span> : null}
      </div>
      <div tw="flex-1">{children}</div>
      <div tw="flex justify-between border-t pt-3 mt-6 text-[9px] text-gray-400">
        <span>Admobi · admobihq.com</span>
        <span>Confidential — internal use only</span>
      </div>
    </div>
  )
}
