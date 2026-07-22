import {
  BarChart3,
  LayoutDashboard,
  Map,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type AppNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
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
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Account, billing, and team preferences will be configured here.",
  },
]

export function navItemForPath(pathname: string): AppNavItem {
  return appNavItems.find((item) => item.href === pathname) ?? appNavItems[0]!
}
