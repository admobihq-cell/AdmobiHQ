import { Bell, Shield, UserCircle, type LucideIcon } from "lucide-react"

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
    description: "Name, email, and access",
  },
  {
    href: "/settings/security",
    label: "Security",
    icon: Shield,
    description: "Password and active sessions",
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Campaign alerts and digests",
  },
]

export function settingsNavItemForPath(pathname: string): SettingsNavItem {
  return (
    settingsNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? settingsNavItems[0]!
  )
}
