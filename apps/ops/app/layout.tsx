import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono } from "next/font/google"

import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { QueryProvider } from "@workspace/query-client"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { getThemeBlockingScript } from "@workspace/ui/lib/theme/blocking-script"
import { cn } from "@workspace/ui/lib/utils"

import "@clerk/ui/themes/shadcn.css"
import "@workspace/ui/globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: {
    default: "Ops Console",
    template: "%s · Admobi",
  },
  description: "Internal operations console for Admobi campaign and fleet data.",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geist.variable, geistMono.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBlockingScript() }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ClerkProvider
            appearance={{ theme: shadcn }}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/home"
            signUpFallbackRedirectUrl="/home"
            afterSignOutUrl="/"
          >
            <TooltipProvider>
              <QueryProvider>{children}</QueryProvider>
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ClerkProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
