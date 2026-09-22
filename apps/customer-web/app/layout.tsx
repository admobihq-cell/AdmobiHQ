import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { StaleDeployReload } from "@/components/stale-deploy-reload"
import { CookieConsentBanner } from "@workspace/ui/components/cookie-consent-banner"
import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { QueryProvider } from "@workspace/query-client"
import { cn } from "@workspace/ui/lib/utils"
import { ThemeScript } from "@workspace/ui/components/theme-script"
import { webPublicUrl } from "@/lib/site-urls"

import "@workspace/ui/globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: {
    default: "Customer App",
    template: "%s · Admobi",
  },
  description: "Create and manage taxi-top OOH campaigns with Admobi.",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  robots: { index: false, follow: false },
}

function Providers({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY is required — customer auth is always on.",
    )
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/auth/login"
      signUpUrl="/auth/signup"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/auth/login"
    >
      {children}
    </ClerkProvider>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geist.variable, geistMono.variable)}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <ThemeProvider>
            <TooltipProvider>
              <QueryProvider>{children}</QueryProvider>
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ThemeProvider>
        </Providers>
        <Analytics />
        <StaleDeployReload />
        <CookieConsentBanner privacyHref={`${webPublicUrl()}/privacy#cookies`} />
      </body>
    </html>
  )
}
