import { Compass, Package, ShieldCheck, UserCircle, type LucideIcon } from "lucide-react"

export type SettingsNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    href: "/settings/profile",
    label: "Profile & sign-in",
    icon: UserCircle,
    description: "Name, phone, and vehicle",
  },
  {
    href: "/settings/account",
    label: "Account status",
    icon: ShieldCheck,
    description: "Verification status and submitted documents",
  },
  {
    href: "/settings/preferences",
    label: "Delivery preferences",
    icon: Package,
    description: "Your opt-in for carrying deliveries",
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
