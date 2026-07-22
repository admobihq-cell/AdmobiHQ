import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"

import { NotFoundPage } from "@workspace/ui/components/not-found-page"
import { THEME_STORAGE_KEY } from "@workspace/ui/lib/theme/config"
import { getThemeBlockingScript } from "@workspace/ui/lib/theme/blocking-script"
import { getServerThemeClass } from "@workspace/ui/lib/theme/persist"
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
 * Required when the app uses multiple root layouts (`(marketing)` / `(payload)`),
 * because segment `not-found.tsx` files only run when `notFound()` is called
 * inside that segment — not for arbitrary unknown URLs.
 */
export default async function GlobalNotFound() {
  const cookieStore = await cookies()
  const serverTheme = getServerThemeClass(
    cookieStore.get(THEME_STORAGE_KEY)?.value,
  )

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "scroll-smooth antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        serverTheme,
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
          <SiteHeader />
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
