"use client"

import { useCallback, useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { BarChart3, LifeBuoy, Megaphone, Moon, Plus, Settings, Upload, Wallet } from "lucide-react"
import type { SearchGroup } from "@workspace/ops-contracts"

import { CommandPalette, type PaletteItem } from "@workspace/ui/components/command-palette"
import { useTheme } from "@workspace/ui/components/theme-provider"

import { visibleNavItems } from "@/lib/navigation"
import { searchRecords } from "@/lib/search-client"
import { settingsNavItems } from "@/lib/settings-navigation"
import { useOrgPermissions } from "@/lib/use-org"

const BILLING_TABS = [
  { value: "overview", label: "Overview" },
  { value: "transactions", label: "Transactions" },
  { value: "invoices", label: "Invoices" },
  { value: "statements", label: "Statements" },
]

const REPORT_TABS = [
  { value: "overview", label: "Overview" },
  { value: "delivery", label: "Delivery" },
  { value: "audience", label: "Audience" },
  { value: "spend", label: "Spend" },
  { value: "campaigns", label: "Campaigns" },
]

export function CustomerCommandPalette({ enabledFlags }: { enabledFlags: string[] }) {
  const { getToken } = useAuth()
  const { can } = useOrgPermissions()
  const { resolvedTheme, setTheme } = useTheme()

  const { pages, actions } = useMemo(() => {
    const pages: PaletteItem[] = [
      ...visibleNavItems(new Set(enabledFlags)).map((item) => ({
        id: `page:${item.href}`,
        label: item.label,
        description: item.description,
        icon: item.icon,
        href: item.href,
      })),
      ...settingsNavItems
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({ id: `page:${item.href}`, label: `Settings · ${item.label}`, icon: Settings, href: item.href })),
      { id: "page:/settings/support", label: "Support cases", icon: LifeBuoy, href: "/settings/support" },
      ...(can("billing:read")
        ? BILLING_TABS.map((t) => ({
            id: `page:/billing?tab=${t.value}`,
            label: `Billing · ${t.label}`,
            icon: Wallet,
            href: `/billing?tab=${t.value}`,
          }))
        : []),
      ...(can("reports:read")
        ? REPORT_TABS.map((t) => ({
            id: `page:/reports?tab=${t.value}`,
            label: `Reports · ${t.label}`,
            icon: BarChart3,
            href: `/reports?tab=${t.value}`,
          }))
        : []),
    ]

    const candidates: Array<PaletteItem | false> = [
      can("campaigns:write") && {
        id: "action:new-campaign",
        label: "New campaign",
        icon: Megaphone,
        href: "/campaigns/new",
        keywords: ["create", "launch"],
      },
      can("billing:write") && {
        id: "action:top-up",
        label: "Top up funds",
        icon: Plus,
        href: "/billing?topup=",
        keywords: ["pay", "wallet", "balance", "mpesa"],
      },
      can("media:write") && {
        id: "action:upload-media",
        label: "Upload media",
        icon: Upload,
        href: "/media",
        keywords: ["creative", "image", "video"],
      },
      {
        id: "action:contact-support",
        label: "Contact support",
        icon: LifeBuoy,
        href: "/settings/support/new",
        keywords: ["help", "ticket", "case"],
      },
      {
        id: "action:theme",
        label: "Switch theme",
        description: resolvedTheme === "dark" ? "Use light mode" : "Use dark mode",
        icon: Moon,
        onRun: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        keywords: ["dark", "light", "appearance"],
      },
    ]
    return { pages, actions: candidates.filter((a): a is PaletteItem => a !== false) }
  }, [enabledFlags, can, resolvedTheme, setTheme])

  const search = useCallback(
    async (q: string, signal: AbortSignal): Promise<SearchGroup[]> => (await searchRecords(getToken, q, signal)).groups,
    [getToken]
  )

  return <CommandPalette pages={pages} actions={actions} search={search} storageKey="customer-palette-recent-v1" />
}
