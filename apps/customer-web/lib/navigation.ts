import {
  BarChart3,
  HelpCircle,
  LayoutDashboard,
  Map,
  Megaphone,
  Package,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type AppNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
  /** Only shown when the matching platform flag is enabled — see lib/flags.ts. */
  flag?: string
}

export const appNavItems: AppNavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Your dashboard and account summary will appear here.",
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    description: "Create and manage out-of-home campaigns from this workspace.",
  },
  {
    href: "/settings/billing",
    label: "Wallet",
    icon: Wallet,
    description: "Fund your campaigns and track spend.",
  },
  {
    href: "/map",
    label: "Map",
    icon: Map,
    description:
      "Explore Nairobi on Clean, Streets, or 3D basemaps.",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    description: "Performance metrics and delivery reports will live here.",
  },
  {
    href: "/deliveries",
    label: "Deliveries",
    icon: Package,
    description: "Book a pickup and dropoff for one of our screen-carrying drivers.",
    flag: "deliveries",
  },
  {
    href: "/settings/support",
    label: "Support",
    icon: HelpCircle,
    description: "Get help and reach the Admobi team.",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Account, billing, and team preferences will be configured here.",
  },
]

/** Matches nested routes too (e.g. /settings/billing under /settings), not just an exact pathname. */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function navItemForPath(pathname: string): AppNavItem {
  return (
    appNavItems.find((item) => isNavItemActive(pathname, item.href)) ?? appNavItems[0]!
  )
}

export function visibleNavItems(enabledFlags: Set<string>): AppNavItem[] {
  return appNavItems.filter((item) => !item.flag || enabledFlags.has(item.flag))
}
