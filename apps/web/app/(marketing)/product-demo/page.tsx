import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { AppDemoPhone } from "@/components/marketing/app-demo-phone"
import { Container } from "@/components/landing/container"
import { MarketingPageJsonLd } from "@/components/seo/marketing-page-json-ld"
import { pageMetadata } from "@/lib/seo/site"

export const metadata = pageMetadata({
  title: "Try the Admobi app | interactive product demo | Admobi Kenya",
  description:
    "Explore the real Admobi advertiser app right in your browser. Track campaigns, browse coverage, and try support, no download and no account required.",
  path: "/product-demo",
})

const tryables = [
  {
    title: "Track live campaigns",
    body: "Browse status, spend, and proof-of-play the way advertisers see it once a flight goes live.",
  },
  {
    title: "Explore Nairobi coverage",
    body: "Pan the same corridor map campaigns run on, switch basemaps, and see route density.",
  },
  {
    title: "Try support, end to end",
    body: "Send a request and watch a reply land, the same flow advertisers use once they are live.",
  },
]

const leftTryables = tryables.filter((_, index) => index % 2 === 0)
const rightTryables = tryables.filter((_, index) => index % 2 === 1)

export default function ProductDemoPage() {
  return (
    <>
      <MarketingPageJsonLd
        path="/product-demo"
        name="Try the Admobi app | interactive product demo | Admobi Kenya"
        description="Explore the real Admobi advertiser app in your browser, no download required."
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Try the app", path: "/product-demo" },
        ]}
      />

      <div className="border-b border-border pb-14 sm:pb-20">
        <section className="border-border border-b bg-foreground text-background py-14 sm:py-20 lg:py-24">
          <Container>
            <div className="max-w-2xl space-y-6">
              <div className="space-y-3">
                <p className="text-background/65 text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:text-xs">
                  Live product demo
                </p>
                <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
                  This is the real Admobi app, running in your browser
                </h1>
                <p className="text-background/82 max-w-[58ch] text-lg leading-relaxed sm:text-xl">
                  Not a video, not a clickable prototype: the same app code advertisers use, compiled
                  straight from our codebase and dropped into this page. Tap around below, no download
                  and no account needed.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link href="/start-campaign">Start a campaign</Link>
              </Button>
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20">
          <Container>
            <div className="mx-auto max-w-xl space-y-3 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                What to try
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                This build runs on sample data, so explore freely. Nothing you do here reaches a real
                account or a real support inbox.
              </p>
            </div>

            <div className="mt-12 hidden justify-center gap-8 xl:flex">
              <div className="flex w-64 flex-col justify-around gap-10 py-8">
                {leftTryables.map((item) => (
                  <div key={item.title} className="flex items-center justify-end gap-6 text-right">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                    </div>
                    <span className="relative h-px w-8 shrink-0 bg-border">
                      <span className="bg-primary absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full" />
                    </span>
                  </div>
                ))}
              </div>

              <AppDemoPhone />

              <div className="flex w-64 flex-col justify-around gap-10 py-8">
                {rightTryables.map((item) => (
                  <div key={item.title} className="flex items-center gap-6">
                    <span className="relative h-px w-8 shrink-0 bg-border">
                      <span className="bg-primary absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full" />
                    </span>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-12 xl:hidden">
              <AppDemoPhone />
              <ul className="grid w-full max-w-2xl gap-8 sm:grid-cols-3">
                {tryables.map((item) => (
                  <li key={item.title} className="space-y-1.5 text-center">
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      </div>
    </>
  )
}
