"use client"

import { useCallback, useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { LifeBuoy, Moon, Settings, Siren, Wallet } from "lucide-react"
import type { SearchGroup } from "@workspace/ops-contracts"

import { CommandPalette, type PaletteItem } from "@workspace/ui/components/command-palette"
import { useTheme } from "@workspace/ui/components/theme-provider"

import { visibleNavItems } from "@/lib/navigation"
import { searchRecords } from "@/lib/search-client"
import { settingsNavItems } from "@/lib/settings-navigation"

export function DriverCommandPalette({ enabledFlags }: { enabledFlags: string[] }) {
  const { getToken } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const { pages, actions } = useMemo(() => {
    const pages: PaletteItem[] = [
      ...visibleNavItems(new Set(enabledFlags)).map((item) => ({
        id: `page:${item.href}`,
        label: item.label,
        icon: item.icon,
        href: item.href,
      })),
      ...settingsNavItems.map((item) => ({
        id: `page:${item.href}`,
        label: `Settings · ${item.label}`,
        icon: Settings,
        href: item.href,
      })),
    ]
    const actions: PaletteItem[] = [
      { id: "action:sos", label: "Report an emergency (SOS)", icon: Siren, href: "/sos", keywords: ["accident", "help", "danger"] },
      { id: "action:contact-support", label: "Contact support", icon: LifeBuoy, href: "/settings/support/new", keywords: ["help", "case"] },
      { id: "action:payouts", label: "View payouts", icon: Wallet, href: "/payouts", keywords: ["money", "earnings", "mpesa"] },
      {
        id: "action:theme",
        label: "Switch theme",
        description: resolvedTheme === "dark" ? "Use light mode" : "Use dark mode",
        icon: Moon,
        onRun: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        keywords: ["dark", "light", "appearance"],
      },
    ]
    return { pages, actions }
  }, [enabledFlags, resolvedTheme, setTheme])

  const search = useCallback(
    async (q: string, signal: AbortSignal): Promise<SearchGroup[]> => (await searchRecords(getToken, q, signal)).groups,
    [getToken]
  )

  return <CommandPalette pages={pages} actions={actions} search={search} storageKey="driver-palette-recent-v1" />
}
