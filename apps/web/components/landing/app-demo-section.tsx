import Link from "next/link"

import { AppDemoPhone } from "@/components/marketing/app-demo-phone"

import { Container } from "./container"

const tryables = [
  "Track live campaigns the way advertisers see them once a flight goes live.",
  "Pan the same Nairobi corridor map campaigns run on.",
  "Send a support request and watch a reply land, end to end.",
] as const

export function AppDemoSection() {
  return (
    <section id="app-demo" className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
          <div className="max-w-prose lg:order-1">
            <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
              The real Admobi app, right in your browser
            </h2>
            <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
              Not a video, not a clickable prototype: the same app code advertisers use, compiled
              straight from our codebase. Press play below and tap around, no download and no
              account needed.
            </p>
            <ul className="mt-8 list-none space-y-4">
              {tryables.map((item) => (
                <li key={item} className="text-foreground flex gap-3 text-base leading-relaxed">
                  <span className="text-primary mt-2 size-1.5 shrink-0 rounded-full bg-current" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/product-demo"
              className="text-primary mt-8 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
            >
              Open the full demo
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="lg:order-2">
            <AppDemoPhone />
          </div>
        </div>
      </Container>
    </section>
  )
}
