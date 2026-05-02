"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "@/components/theme-toggle"

import { Container } from "./container"
import { Logo } from "./logo"

const navItems = [
  { href: "/products-solutions", label: "Products" },
  { href: "#markets", label: "Rollout" },
  { href: "#get-started", label: "Get started" },
  { href: "#faq", label: "FAQ" },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  const linkClass =
    "rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:py-1.5"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <Container className="flex h-14 items-center justify-between gap-4 sm:h-16">
        <Link
          href="/"
          className="min-w-0 shrink rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <nav
          aria-label="Primary"
          className="hidden flex-wrap items-center justify-end gap-1 lg:flex"
        >
          {navItems.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
          <ThemeToggle />
          <span className="mx-1 hidden h-6 w-px bg-border xl:block" aria-hidden />
          <Button asChild size="sm" variant="outline" className="ml-2">
            <Link href="/partner-fleet">Partner your fleet</Link>
          </Button>
          <Button asChild size="sm" className="ml-1">
            <Link href="/start-campaign">Start a campaign</Link>
          </Button>
        </nav>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </Container>
      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-border bg-background lg:hidden"
        >
          <Container className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-sm font-medium text-foreground">Appearance</span>
              <ThemeToggle />
            </div>
            <nav aria-label="Mobile primary" className="flex flex-col gap-1">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={linkClass}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <Button asChild variant="outline" size="sm" className="w-full sm:flex-1">
                <Link href="/partner-fleet" onClick={() => setOpen(false)}>
                  Partner your fleet
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full sm:flex-1">
                <Link href="/start-campaign" onClick={() => setOpen(false)}>
                  Start a campaign
                </Link>
              </Button>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  )
}
