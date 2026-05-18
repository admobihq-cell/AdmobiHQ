import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { WhatsappFab } from "@/components/landing/whatsapp-fab"
import { cn } from "@workspace/ui/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Admobi — Digital taxi-top OOH in Nairobi",
    template: "%s · Admobi",
  },
  description:
    "Geotargeted LED taxi-top advertising in Kenyan cities. Campaigns that move with traffic, from one-day bursts to sustained books.",
  openGraph: {
    title: "Admobi — Digital taxi-top OOH",
    description:
      "Reach Nairobi in motion with geo and schedule control. Fleet and advertiser programs.",
    type: "website",
    locale: "en_KE",
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
      <body>
        <ThemeProvider>
          {children}
          <WhatsappFab />
        </ThemeProvider>
      </body>
    </html>
  )
}
