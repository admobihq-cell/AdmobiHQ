import { Bell, Compass, UserCircle, type LucideIcon } from "lucide-react"

export type SettingsNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    href: "/settings/account",
    label: "Profile & sign-in",
    icon: UserCircle,
    description: "Identity, sign-in, and sessions",
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Campaign alerts and digests",
  },
  {
    href: "/settings/tour",
    label: "Product tour",
    icon: Compass,
    description: "Replay the welcome tour or any chapter",
  },
]

export function settingsNavItemForPath(pathname: string): SettingsNavItem {
  return (
    settingsNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? settingsNavItems[0]!
  )
}
