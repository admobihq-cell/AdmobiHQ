import Image from "next/image"
import Link from "next/link"

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
            <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-[0.22em] sm:text-xs">
              Live product demo
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.25rem]">
              This is the real Admobi app, right in your browser
            </h2>
            <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
              Not a video, not a clickable prototype: the same app code advertisers use, compiled
              straight from our codebase. Press play and tap around, no download and no account
              needed.
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
              Try the live demo
              <span aria-hidden>→</span>
            </Link>
          </div>

          <Link
            href="/product-demo"
            aria-label="Try the live Admobi app demo"
            className="group relative block lg:order-2"
          >
            <Image
              src="/admobi-mockup.png"
              alt="The Admobi app splash screen shown on an iPhone mockup"
              width={2000}
              height={1333}
              className="h-auto w-full transition-transform duration-300 ease-out group-hover:-translate-y-1"
              priority={false}
            />
            <span className="text-foreground bg-background/95 absolute bottom-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold shadow-[0_12px_30px_-10px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out group-hover:-translate-y-1">
              Try the live demo
              <span aria-hidden>→</span>
            </span>
          </Link>
        </div>
      </Container>
    </section>
  )
}
