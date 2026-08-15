"use client"

import Script from "next/script"
import { useEffect, useState } from "react"

import { hasFullConsent } from "@workspace/ui/lib/cookie-consent"

// No NEXT_PUBLIC_GA_ID override needed for the real production deploy — it
// falls back to the existing production ID there. VERCEL_ENV (not NODE_ENV,
// which Vercel sets to "production" for preview/staging builds too) is what
// actually distinguishes the real production domain, so local dev and
// staging/preview deploys stay silent by default instead of reporting into
// the production GA property.
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID ??
  (process.env.VERCEL_ENV === "production" ? "G-01QR9P6WJB" : undefined)

export function GoogleAnalytics() {
  // Consent lives in localStorage, so this can't be decided on the server —
  // start closed and only open once the client confirms "Accept all" was
  // chosen (mirrors CookieConsentBanner's own mount-time check).
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    setConsented(hasFullConsent())
  }, [])

  if (!GA_MEASUREMENT_ID || !consented) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
