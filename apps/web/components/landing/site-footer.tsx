import Link from "next/link"

import { Container } from "./container"
import { Logo } from "./logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12 sm:py-14">
      <Container>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Logo />
            <p className="text-muted-foreground max-w-[40ch] text-sm leading-relaxed">
              Digital taxi-top screens for brands that need motion, geography, and speed in Kenyan cities.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-foreground font-medium">Company</p>
              <ul className="text-muted-foreground space-y-1">
                <li>
                  <Link className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#get-started">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#media-kit">
                    Media kit
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-foreground font-medium">Legal</p>
              <ul className="text-muted-foreground space-y-1">
                <li>
                  <Link className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="text-muted-foreground mt-10 flex flex-col gap-2 border-t border-border pt-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Admobi. English first.</p>
          <p className="font-mono text-[0.7rem]">Press D to toggle theme</p>
        </div>
      </Container>
    </footer>
  )
}
