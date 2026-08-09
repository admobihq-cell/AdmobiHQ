import {
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
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Profile and delivery preferences will be configured here.",
  },
]

/** Matches nested routes too, not just an exact pathname. */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
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
