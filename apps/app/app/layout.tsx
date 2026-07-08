import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import { Analytics } from "@vercel/analytics/next"

import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { THEME_STORAGE_KEY } from "@workspace/ui/lib/theme/config"
import { getThemeBlockingScript } from "@workspace/ui/lib/theme/blocking-script"
import { getServerThemeClass } from "@workspace/ui/lib/theme/persist"
import { cn } from "@workspace/ui/lib/utils"

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const serverTheme = getServerThemeClass(cookieStore.get(THEME_STORAGE_KEY)?.value)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geist.variable, geistMono.variable, serverTheme)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBlockingScript() }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
