"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import {
  Car,
  ChevronDown,
  Image as ImageIcon,
  LayoutGrid,
  Menu,
  MonitorSmartphone,
  Rocket,
  Route,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { getMediaAlt, getMediaImageSrc } from "@/lib/payload/media-url"
import { BLOG_PATH } from "@/lib/seo/site"
import type { BlogPostListItem } from "@/lib/payload/types"

import { Container } from "./container"
import { Logo } from "./logo"

type NavChild = { href: string; label: string; description: string; icon: LucideIcon }

type NavItem =
  | { kind: "link"; href: string; label: string }
  | { kind: "links"; href: string; label: string; children: NavChild[] }
  | { kind: "blog"; href: string; label: string }

/**
 * Original top-level nav labels; related routes (incl. SEO anchors) nest under
 * the matching parent, e.g. start-campaign under Pricing, media-kit under Products.
 * Each dropdown's own overview page (the parent href) is folded in as its first
 * child card, since the trigger itself now opens the panel instead of navigating.
 */
const navItems: NavItem[] = [
  {
    kind: "links",
    href: "/products-solutions",
    label: "Products & solutions",
    children: [
      {
        href: "/products-solutions",
        label: "All products & solutions",
        description: "Everything Admobi offers, in one place",
        icon: LayoutGrid,
      },
      {
        href: "/product-demo",
        label: "Try the live app demo",
        description: "Explore the real advertiser app in your browser",
        icon: MonitorSmartphone,
      },
      {
        href: "/media-kit",
        label: "Media kit & creative specs",
        description: "Sizes, codecs, and safe zones for your creative",
        icon: ImageIcon,
      },
      {
        href: "/",
        label: "Taxi-top OOH overview",
        description: "How fleet, network, and scheduling fit together",
        icon: Car,
      },
    ],
  },
  {
    kind: "links",
    href: "/pricing",
    label: "Pricing",
    children: [
      {
        href: "/pricing",
        label: "Pricing overview",
        description: "Rates, minimums, and how billing works",
        icon: Tag,
      },
      {
        href: "/start-campaign",
        label: "Start OOH campaign",
        description: "Book corridors and a launch window",
        icon: Rocket,
      },
    ],
  },
  { kind: "blog", href: BLOG_PATH, label: "Blog" },
  { kind: "link", href: "/help", label: "Help" },
  {
    kind: "links",
    href: "/drivers",
    label: "Drivers",
    children: [
      {
        href: "/drivers",
        label: "Drivers overview",
        description: "Requirements, payouts, and how it works",
        icon: Route,
      },
      {
        href: "/partner-fleet",
        label: "Partner taxi-top fleet",
        description: "Register your vehicles for the network",
        icon: Users,
      },
    ],
  },
]

const linkClass =
  "rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:py-1.5"

const triggerClass = `${linkClass} inline-flex items-center gap-1 pe-1.5`

const panelClass =
  "border-border bg-background animate-in fade-in-0 slide-in-from-top-1 motion-reduce:animate-none absolute left-0 top-full z-50 mt-2 rounded-xl border p-2 shadow-lg duration-150 ease-out"

/** Popover open state: hover-intent open/close plus outside-click and Escape dismissal. */
function usePopover<T extends HTMLElement>() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<T>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  // Tracks whether the panel is currently open because of mouse hover-intent, so a
  // click that lands right after the hover-open (moving the mouse in to click always
  // fires mouseenter first) confirms/keeps it open instead of toggling it shut again.
  const hoverActive = useRef(false)

  const openNow = () => {
    hoverActive.current = true
    clearCloseTimer()
    setOpen(true)
  }

  const closeSoon = () => {
    hoverActive.current = false
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const closeNow = () => {
    hoverActive.current = false
    clearCloseTimer()
    setOpen(false)
  }

  const handleTriggerClick = () => {
    if (hoverActive.current) {
      setOpen(true)
      return
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      closeNow()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNow()
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  useEffect(() => clearCloseTimer, [])

  return { open, rootRef, openNow, closeSoon, closeNow, toggle: handleTriggerClick }
}

function NavChildCard({
  item,
  role,
  onNavigate,
}: {
  item: NavChild
  role?: "menuitem"
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      role={role}
      className="focus-visible:ring-ring flex items-start gap-3 rounded-lg p-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2"
      onClick={onNavigate}
    >
      <span className="border-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg border">
        <Icon className="text-foreground size-4" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5 pt-0.5">
        <span className="text-foreground text-sm font-medium leading-none">{item.label}</span>
        <span className="text-muted-foreground text-xs leading-snug">{item.description}</span>
      </span>
    </Link>
  )
}

function BlogPreviewCard({
  post,
  role,
  orientation = "vertical",
  onNavigate,
}: {
  post: BlogPostListItem
  role?: "menuitem"
  orientation?: "vertical" | "horizontal"
  onNavigate?: () => void
}) {
  const imageUrl = getMediaImageSrc(post.featuredImage, "thumbnail")
  const alt = getMediaAlt(post.featuredImage)

  if (orientation === "horizontal") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        role={role}
        className="focus-visible:ring-ring flex items-center gap-3 rounded-lg p-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2"
        onClick={onNavigate}
      >
        <span className="border-border bg-muted relative block size-12 shrink-0 overflow-hidden rounded-md border">
          {imageUrl ? (
            <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="48px" />
          ) : null}
        </span>
        <span className="text-foreground line-clamp-2 text-sm font-medium leading-snug">
          {post.title}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      role={role}
      className="focus-visible:ring-ring flex flex-col gap-2 rounded-lg p-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2"
      onClick={onNavigate}
    >
      <span className="border-border bg-muted relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border">
        {imageUrl ? (
          <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="160px" />
        ) : null}
      </span>
      <span className="text-foreground line-clamp-2 text-sm font-medium leading-snug">
        {post.title}
      </span>
    </Link>
  )
}

/** Nav trigger that opens its panel on hover-intent as well as click/tap, on the whole label + chevron. */
function NavPopover({
  label,
  panelClassName,
  render,
}: {
  label: string
  panelClassName: string
  render: (close: () => void) => ReactNode
}) {
  const { open, rootRef, openNow, closeSoon, closeNow, toggle } = usePopover<HTMLDivElement>()
  const menuId = useId()

  return (
    <div
      ref={rootRef}
      className="relative flex items-center"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={toggle}
      >
        {label}
        <ChevronDown
          className={`size-3.5 shrink-0 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={menuId} role="menu" className={`${panelClass} ${panelClassName}`}>
          {render(closeNow)}
        </div>
      ) : null}
    </div>
  )
}

function DesktopNavItem({
  item,
  recentPosts,
  onNavigate,
}: {
  item: NavItem
  recentPosts: BlogPostListItem[]
  onNavigate?: () => void
}) {
  if (item.kind === "link") {
    return (
      <Link href={item.href} className={linkClass}>
        {item.label}
      </Link>
    )
  }

  if (item.kind === "links") {
    return (
      <NavPopover
        label={item.label}
        panelClassName={item.children.length > 1 ? "grid w-[30rem] grid-cols-2 gap-1" : "w-[19rem]"}
        render={(close) => (
          <>
            {item.children.map((child) => (
              <NavChildCard
                key={child.href}
                item={child}
                role="menuitem"
                onNavigate={() => {
                  close()
                  onNavigate?.()
                }}
              />
            ))}
          </>
        )}
      />
    )
  }

  if (recentPosts.length === 0) {
    return (
      <Link href={item.href} className={linkClass}>
        {item.label}
      </Link>
    )
  }

  return (
    <NavPopover
      label={item.label}
      panelClassName="w-[32rem]"
      render={(close) => (
        <>
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-[0.18em]">
              Latest posts
            </span>
            <Link
              href={BLOG_PATH}
              role="menuitem"
              className="text-foreground text-xs font-medium underline-offset-4 hover:underline"
              onClick={() => {
                close()
                onNavigate?.()
              }}
            >
              View all posts &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {recentPosts.map((post) => (
              <BlogPreviewCard
                key={post.id}
                post={post}
                role="menuitem"
                onNavigate={() => {
                  close()
                  onNavigate?.()
                }}
              />
            ))}
          </div>
        </>
      )}
    />
  )
}

function MobileNavItem({
  item,
  recentPosts,
  onNavigate,
}: {
  item: NavItem
  recentPosts: BlogPostListItem[]
  onNavigate: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Link href={item.href} className={linkClass} onClick={onNavigate}>
        {item.label}
      </Link>
      {item.kind === "links" ? (
        <ul className="border-border ms-3 flex flex-col gap-0.5 border-s ps-3">
          {item.children.map((child) => (
            <li key={child.href}>
              <NavChildCard item={child} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : null}
      {item.kind === "blog" && recentPosts.length > 0 ? (
        <ul className="border-border ms-3 flex flex-col gap-0.5 border-s ps-3">
          {recentPosts.map((post) => (
            <li key={post.id}>
              <BlogPreviewCard post={post} orientation="horizontal" onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function SiteHeader({
  recentPosts = [],
}: {
  recentPosts?: BlogPostListItem[]
}) {
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
            <DesktopNavItem key={item.href} item={item} recentPosts={recentPosts} />
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
                <MobileNavItem
                  key={item.href}
                  item={item}
                  recentPosts={recentPosts}
                  onNavigate={closeMobile}
                />
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
