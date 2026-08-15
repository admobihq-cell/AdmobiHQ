import {
  HelpCircle,
  LayoutDashboard,
  Package,
  Route,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type DriverNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
  /** Only shown when the matching platform flag is enabled — see lib/flags.ts. */
  flag?: string
}

export const driverNavItems: DriverNavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Your day at a glance — earnings, routes, and payouts in one place.",
  },
  {
    href: "/earnings",
    label: "Earnings",
    icon: Wallet,
    description: "Pay from active screen hours and route bonuses will appear here.",
  },
  {
    href: "/routes",
    label: "Routes",
    icon: Route,
    description: "Where you've driven and which routes earned the most.",
  },
  {
    href: "/payouts",
    label: "Payouts",
    icon: Package,
    description: "Pending and settled payouts will be tracked here.",
  },
  {
    href: "/deliveries",
    label: "Deliveries",
    icon: Package,
    description: "Available and assigned delivery jobs will appear here.",
    flag: "deliveries",
  },
  {
    href: "/settings/support",
    label: "Support",
    icon: HelpCircle,
    description: "Get help and reach the Admobi team.",
  },
  {
    href: "/settings/profile",
    label: "Settings",
    icon: Settings,
    description: "Profile and delivery preferences will be configured here.",
  },
]

/** Matches nested routes too, not just an exact pathname. The Settings item
 * links straight to /settings/profile (skipping the bare /settings redirect
 * for in-app nav clicks), but it still needs to read as "active" for every
 * settings sub-page — /settings/account, /settings/preferences, etc. —
 * except /settings/support, which is its own separate nav item above. */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  if (href === "/settings/profile") {
    return pathname.startsWith("/settings") && !pathname.startsWith("/settings/support")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function navItemForPath(pathname: string): DriverNavItem {
  return (
    driverNavItems.find((item) => isNavItemActive(pathname, item.href)) ?? driverNavItems[0]!
  )
}

export function visibleNavItems(enabledFlags: Set<string>): DriverNavItem[] {
  return driverNavItems.filter((item) => !item.flag || enabledFlags.has(item.flag))
}
