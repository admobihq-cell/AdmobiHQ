import { Compass, ToggleLeft, type LucideIcon } from "lucide-react"

export type SettingsNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    href: "/settings/flags",
    label: "Platform flags",
    icon: ToggleLeft,
    description: "Feature rollout controls",
  },
  {
    href: "/settings/tour",
    label: "Product tour",
    icon: Compass,
    description: "Replay the console orientation tour",
  },
]

export function settingsNavItemForPath(pathname: string): SettingsNavItem {
  return (
    settingsNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? settingsNavItems[0]!
  )
}
