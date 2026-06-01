import Link from "next/link"

import { LastUpdated } from "@/components/seo/last-updated"

import { Container } from "./container"
import { Logo } from "./logo"

const footerLinkClass =
  "inline-block rounded-md py-1 text-muted-foreground text-sm underline-offset-[3px] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const columns = [
  {
    id: "product",
    heading: "Product",
    links: [
      { href: "/products-solutions", label: "Products & solutions" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#product", label: "Capabilities" },
      { href: "/media-kit", label: "Media kit" },
    ],
  },
  {
    id: "customers",
    heading: "For advertisers",
    links: [
      { href: "/start-campaign", label: "Start a campaign" },
      { href: "/#who", label: "Who buys OOH here" },
      { href: "/#process", label: "How bookings work" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    id: "fleets",
    heading: "Fleets & drivers",
    links: [
      { href: "/partner-fleet", label: "Partner your fleet" },
      { href: "/drivers", label: "Driver sign-up" },
      { href: "/#markets", label: "Kenya rollout" },
    ],
  },
  {
    id: "legal",
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const

function FooterHeading({ children }: { children: string }) {
  return (
    <p className="text-foreground font-mono text-[0.6875rem] font-medium uppercase tracking-[0.17em]">
      {children}
    </p>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-border border-t bg-muted/25">
      <Container className="py-14 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,3fr)] lg:gap-16 xl:gap-20">
          <div className="space-y-5">
            <Link
              href="/"
              className="inline-flex max-w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Logo />
            </Link>
            <p className="text-muted-foreground max-w-[42ch] text-sm leading-relaxed">
              Geo-led taxi-top screens for brands running motion in Kenyan cities.
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Nairobi-first network. Scheduling, creative QA, and proof-of-play that respect how streets actually move.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {columns.map(({ id, heading, links }) => (
              <nav key={id} aria-label={heading} className="min-w-0 space-y-4">
                <FooterHeading>{heading}</FooterHeading>
                <ul className="flex flex-col gap-2">
                  {links.map(({ href, label }) => (
                    <li key={`${href}-${label}`}>
                      <Link href={href} className={footerLinkClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-14 flex flex-col gap-4 border-t pt-10 text-xs sm:mt-16 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="space-y-1">
            <p className="text-foreground text-sm tabular-nums">
              © {year} Admobi
              <span className="text-muted-foreground font-normal">&nbsp;&middot;&nbsp;</span>
              <span>Kenya</span>
            </p>
            <p className="max-w-xl leading-relaxed">
              English first · Copy and policies update as programmes expand.
            </p>
            <LastUpdated className="mt-2" />
          </div>
          <p className="font-mono text-[0.65rem] leading-relaxed uppercase tracking-[0.12em] sm:shrink-0 sm:text-end">
            Press D for theme
          </p>
        </div>
      </Container>
    </footer>
  )
}
