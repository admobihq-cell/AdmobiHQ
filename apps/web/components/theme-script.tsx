import Script from "next/script"

import { getThemeBlockingScript } from "@/lib/theme/blocking-script"

/** Blocking theme initializer — must use next/script (React 19 disallows raw `<script>` in components). */
export function ThemeScript() {
  return (
    <Script
      id="theme-blocking"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: getThemeBlockingScript() }}
    />
  )
}
