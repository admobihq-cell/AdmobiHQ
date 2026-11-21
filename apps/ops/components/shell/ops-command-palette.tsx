"use client"

import { useCallback, useMemo } from "react"
import { ArrowDownCircle, FilePlus2, Megaphone, Moon, Receipt, Settings, Wallet } from "lucide-react"
import type { OpsPermission, OpsRole, SearchGroup } from "@workspace/ops-contracts"

import { CommandPalette, type PaletteItem } from "@workspace/ui/components/command-palette"
import { useTheme } from "@workspace/ui/components/theme-provider"

import { useOpsClient } from "@/lib/ops-client"
import {
  FINANCE_TABS,
  canSeeNavItem,
  dashboardNavItems,
  navItems,
  secondaryItems,
  type NavItem,
} from "@/lib/navigation"

const SETTINGS_TABS = [
  { href: "/settings/flags", label: "Settings · Feature flags" },
  { href: "/settings/integrations", label: "Settings · Integrations" },
  { href: "/settings/tour", label: "Settings · Product tour" },
]

export function OpsCommandPalette({
  role,
  permissions,
  userId,
}: {
  role: OpsRole
  permissions: OpsPermission[]
  /** Scopes recent picks, so a shared browser never shows the last person's records. */
  userId: string
}) {
  const client = useOpsClient()
  const { resolvedTheme, setTheme } = useTheme()

  const { pages, actions } = useMemo(() => {
    const can = (item: { permission?: OpsPermission; adminOnly?: boolean }) => canSeeNavItem(item, role, permissions)
    const toPage = (item: NavItem & { linkHref?: string }, group: string): PaletteItem => ({
      id: `page:${item.href}`,
      label: item.label,
      description: group,
      icon: item.icon,
      href: item.linkHref ?? item.href,
    })

    const pages: PaletteItem[] = [
      ...dashboardNavItems.filter(can).map((i) => toPage(i, "Dashboard")),
      ...navItems.filter(can).map((i) => toPage(i, "Operations")),
      ...secondaryItems.filter(can).map((i) => toPage(i, "Content")),
      ...(can({ permission: "finances" })
        ? FINANCE_TABS.map((t) => ({
            id: `page:/finances?tab=${t.value}`,
            label: `Finances · ${t.label}`,
            icon: Wallet,
            href: `/finances?tab=${t.value}`,
          }))
        : []),
      ...(can({ permission: "flags" })
        ? SETTINGS_TABS.map((t) => ({ id: `page:${t.href}`, label: t.label, icon: Settings, href: t.href }))
        : []),
    ]

    const candidates: Array<PaletteItem | false> = [
      can({ permission: "finances" }) && {
        id: "action:new-document",
        label: "New invoice or quote",
        icon: FilePlus2,
        href: "/finances/documents/new",
        keywords: ["bill", "quotation"],
      },
      // The payout run lives on the Finances page, which needs `finances`.
      can({ permission: "finances" }) && {
        id: "action:payout-run",
        label: "New payout run",
        icon: ArrowDownCircle,
        href: "/finances?tab=payouts",
        keywords: ["drivers", "pay"],
      },
      can({ permission: "finances" }) && {
        id: "action:record-transaction",
        label: "Record a transaction",
        icon: Receipt,
        href: "/finances?tab=ledger",
        keywords: ["ledger", "manual", "top up"],
      },
      can({ permission: "announcements" }) && {
        id: "action:announcement",
        label: "New announcement",
        icon: Megaphone,
        href: "/announcements",
        keywords: ["broadcast", "push"],
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
    const actions = candidates.filter((a): a is PaletteItem => a !== false)

    return { pages, actions }
  }, [role, permissions, resolvedTheme, setTheme])

  const search = useCallback(
    async (q: string, signal: AbortSignal): Promise<SearchGroup[]> => (await client.search.query(q, signal)).groups,
    [client]
  )

  return <CommandPalette pages={pages} actions={actions} search={search} storageKey={`ops-palette-recent-v2:${userId}`} />
}
