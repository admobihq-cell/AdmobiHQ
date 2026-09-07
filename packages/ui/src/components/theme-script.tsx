import { getThemeBlockingScript } from "@workspace/ui/lib/theme/blocking-script"

/**
 * Applies the stored theme to <html> before the first paint.
 *
 * This MUST be rendered inside the document <head>, as a plain inline <script>.
 * Rendering it in <body> via next/script's "beforeInteractive" strategy hands
 * the timing to Next's script pipeline instead of the HTML parser, and it lands
 * after the first paint — so the page paints in the default theme and then
 * swaps, which is the exact flash this script exists to prevent. apps/web never
 * had that flash because its layouts always inlined the raw tag in <head>; the
 * three app shells did, because they used next/script in <body>.
 *
 * suppressHydrationWarning because the script mutates <html> before React
 * hydrates the tree the script itself is part of.
 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: getThemeBlockingScript() }}
      suppressHydrationWarning
    />
  )
}
