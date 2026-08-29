import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { NotFoundPage } from "@workspace/ui/components/not-found-page"
import { getThemeBlockingScript } from "@workspace/ui/lib/theme/blocking-script"
import { cn } from "@workspace/ui/lib/utils"

import { Container } from "@/components/landing/container"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { ThemeProvider } from "@/components/theme-provider"

import "@workspace/ui/globals.css"

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

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: false },
}

/**
 * Global unmatched-route 404 (Next.js 15.4+ / 16).
 * Must stay static: no cookies(), no Payload. Scanner 404s were booting
 * Neon on every probe.
 */
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "scroll-smooth antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBlockingScript() }}
          suppressHydrationWarning
        />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider>
          <SiteHeader recentPosts={[]} />
          <main>
            <Container>
              <NotFoundPage
                title="This page isn't on the map"
                description="The URL may be wrong, or the page may have moved. Head back to the homepage to explore Admobi."
                homeLabel="Back to Admobi"
              />
            </Container>
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  )
}
