import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "@workspace/ui/globals.css"
import { JsonLd } from "@/components/seo/json-ld"
import { ThemeProvider } from "@/components/theme-provider"
import { WhatsappFab } from "@/components/landing/whatsapp-fab"
import { websiteJsonLd } from "@/lib/seo/schema"
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo/site"
import { cn } from "@workspace/ui/lib/utils"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  fallback: ["system-ui", "arial"],
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  fallback: ["courier new", "monospace"],
})

const HOME_TITLE = "Taxi-top LED advertising in Nairobi | Admobi"
const HOME_DESCRIPTION =
  "Geotargeted LED taxi-top advertising in Kenyan cities. Launch campaigns with geo and schedule control, from one-day bursts to sustained books."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s · Admobi",
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: { "en-ke": `${SITE_URL}/` },
  },
  other: {
    "geo.region": "KE-110",
    "geo.placename": "Nairobi",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_KE",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Admobi — Digital taxi-top OOH in Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("scroll-smooth antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <head>
        <JsonLd data={websiteJsonLd} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <WhatsappFab />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
