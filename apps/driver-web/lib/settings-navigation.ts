import { Package, UserCircle, type LucideIcon } from "lucide-react"

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
    description: "Name, phone, and vehicle",
  },
  {
    href: "/settings/preferences",
    label: "Delivery preferences",
    icon: Package,
    description: "Your opt-in for carrying deliveries",
  },
]

export function settingsNavItemForPath(pathname: string): SettingsNavItem {
  return (
    settingsNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? settingsNavItems[0]!
  )
}
