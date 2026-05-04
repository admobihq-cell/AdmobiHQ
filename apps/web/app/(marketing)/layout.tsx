import { SiteHeader } from "@/components/landing/site-header"

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
    </>
  )
}
