"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BLOG_PATH } from "@/lib/seo/site"

import { Container } from "./container"
import { Logo } from "./logo"

type NavChild = { href: string; label: string }

type NavItem =
  | { href: string; label: string; children?: undefined }
  | { href: string; label: string; children: NavChild[] }

/**
 * Original top-level nav labels; related routes (incl. SEO anchors) nest under
 * the matching parent, e.g. start-campaign under Pricing, media-kit under Products.
 */
const navItems: NavItem[] = [
  {
    href: "/products-solutions",
    label: "Products & solutions",
    children: [
      { href: "/media-kit", label: "Media kit & creative specs" },
      { href: "/", label: "Taxi-top OOH overview" },
    ],
  },
  {
    href: "/pricing",
    label: "Pricing",
    children: [{ href: "/start-campaign", label: "Start OOH campaign" }],
  },
  { href: BLOG_PATH, label: "Blog" },
  { href: "/help", label: "Help" },
  {
    href: "/drivers",
    label: "Drivers",
    children: [{ href: "/partner-fleet", label: "Partner taxi-top fleet" }],
  },
]

const linkClass =
  "rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:py-1.5"

const menuItemClass =
  "block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function NavItemDropdown({
  label,
  items,
  onNavigate,
}: {
  label: string
  items: NavChild[]
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative flex items-center">
      <button
        type="button"
        className={`${linkClass} inline-flex items-center gap-0.5 pe-1.5`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={`${label}, more links`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{label}, </span>
        <ChevronDown
          className={`size-3.5 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="border-border bg-background absolute left-0 top-full z-50 mt-1 min-w-[14rem] rounded-lg border p-1 shadow-md"
        >
          {items.map(({ href, label: childLabel }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
            >
              {childLabel}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DesktopNavItem({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const hasChildren = Boolean(item.children?.length)

  return (
    <div className="flex items-center">
      <Link href={item.href} className={linkClass}>
        {item.label}
      </Link>
      {hasChildren ? (
        <NavItemDropdown label={item.label} items={item.children!} onNavigate={onNavigate} />
      ) : null}
    </div>
  )
}

function MobileNavItem({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate: () => void
}) {
  const hasChildren = Boolean(item.children?.length)

  return (
    <div className="flex flex-col gap-0.5">
      <Link href={item.href} className={linkClass} onClick={onNavigate}>
        {item.label}
      </Link>
      {hasChildren ? (
        <ul className="border-border ms-3 flex flex-col gap-0.5 border-s ps-3">
          {item.children!.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={menuItemClass} onClick={onNavigate}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const closeMobile = () => setOpen(false)

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
          {navItems.map((item) => (
            <DesktopNavItem key={item.href} item={item} />
          ))}
          <ThemeToggle />
          <span className="mx-1 hidden h-6 w-px bg-border xl:block" aria-hidden />
          <Button asChild size="sm" variant="outline" className="ml-2 shrink-0">
            <Link href="/partner-fleet">Partner your fleet</Link>
          </Button>
          <Button asChild size="sm" className="ml-1 shrink-0">
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
            <nav aria-label="Mobile primary" className="flex flex-col gap-2">
              {navItems.map((item) => (
                <MobileNavItem key={item.href} item={item} onNavigate={closeMobile} />
              ))}
            </nav>
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <Button asChild variant="outline" size="sm" className="w-full sm:flex-1">
                <Link href="/partner-fleet" onClick={closeMobile}>
                  Partner your fleet
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full sm:flex-1">
                <Link href="/start-campaign" onClick={closeMobile}>
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
