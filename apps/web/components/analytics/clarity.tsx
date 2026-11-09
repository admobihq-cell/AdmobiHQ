"use client"

import Script from "next/script"
import { useEffect, useState } from "react"

import { hasFullConsent } from "@workspace/ui/lib/cookie-consent"

const CLARITY_PROJECT_ID = "zb4xjhtorw"

/** Microsoft Clarity (heatmaps + session recordings). Same consent gate as GoogleAnalytics. */
export function Clarity() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    setConsented(hasFullConsent())
  }, [])

  if (!consented) return null

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      `}
    </Script>
  )
}
