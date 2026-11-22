import {
  BarChart3,
  Building2,
  Car,
  FileCheck2,
  FileText,
  Home,
  History,
  IdCard,
  LifeBuoy,
  Mail,
  Map,
  Megaphone,
  MonitorPlay,
  Radio,
  Settings,
  Siren,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

/** Ops navigation, shared by the sidebar (OpsShell) and the command palette. */

export type NavItem = {
  href: string
  label: string
  icon: typeof Home
  permission?: OpsPermission
}

/**
 * The Dashboards group. Distinct hrefs from the list pages (`/dashboards/campaigns` vs
 * `/campaigns`): active matching is by prefix, so they never light up together. Each dashboard
 * is guarded by the permission of the thing it summarises.
 */
export const dashboardNavItems: NavItem[] = [
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/finances", label: "Finances", icon: Wallet, permission: "finances" },
  { href: "/dashboards/campaigns", label: "Campaigns", icon: MonitorPlay, permission: "campaigns" },
  { href: "/dashboards/advertisers", label: "Advertisers", icon: Building2, permission: "campaigns" },
  { href: "/dashboards/fleet", label: "Fleet", icon: Truck, permission: "drivers" },
  { href: "/dashboards/support", label: "Support & safety", icon: LifeBuoy, permission: "support" },
]

export const navItems: Array<{
  href: string
  label: string
  icon: typeof Home
  permission?: OpsPermission
}> = [
  { href: "/map", label: "Map", icon: Map, permission: "drivers" },
  {
    href: "/leads",
    label: "Campaign Leads",
    icon: Megaphone,
    permission: "leads",
  },
  { href: "/fleet", label: "Fleet Partners", icon: Truck, permission: "fleet" },
  { href: "/drivers", label: "Drivers", icon: Car, permission: "drivers" },
  {
    href: "/driver-applications",
    label: "Driver Applications",
    icon: FileCheck2,
    permission: "driver_applications",
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: MonitorPlay,
    permission: "campaigns",
  },
  {
    href: "/advertiser-orgs",
    label: "Advertiser orgs",
    icon: Building2,
    permission: "campaigns",
  },
  { href: "/waitlist", label: "Waitlist", icon: Mail, permission: "waitlist" },
  {
    href: "/media-kit",
    label: "Media Kit",
    icon: FileText,
    permission: "media_kit",
  },
  {
    href: "/announcements",
    label: "Announcements",
    icon: Radio,
    permission: "announcements",
  },
  // Above Support on purpose: an emergency queue that sorts below the helpdesk
  // is a queue nobody checks first.
  { href: "/sos", label: "SOS", icon: Siren, permission: "safety" },
  { href: "/support", label: "Support", icon: LifeBuoy, permission: "support" },
  {
    href: "/activity",
    label: "Activity",
    icon: History,
    permission: "activity",
  },
]

export const secondaryItems: Array<{
  href: string
  /** Where the link actually goes, when it differs from the active-match base
   * (e.g. Settings highlights on /settings/* but links straight to its first
   * tab so there's no /settings → /settings/flags redirect hop). */
  linkHref?: string
  label: string
  icon: typeof Users
  permission?: OpsPermission
  adminOnly?: boolean
}> = [
  {
    href: "/content",
    label: "Content (CMS)",
    icon: Users,
    permission: "content",
  },
  { href: "/team", label: "Team", icon: UserCog, adminOnly: true },
  { href: "/users", label: "Users", icon: IdCard, adminOnly: true },
  {
    href: "/settings",
    linkHref: "/settings/flags",
    label: "Settings",
    icon: Settings,
    permission: "flags",
  },
]

/** Routes that exist and need a breadcrumb label but never render in the sidebar. */
export const hiddenNavItems: Array<{ href: string; label: string }> = [
  { href: "/notifications", label: "Notifications" },
]

export const allNavItems = [...dashboardNavItems, ...navItems, ...secondaryItems, ...hiddenNavItems]

/** Matches nested routes too (e.g. /support/42 under /support), not just an exact pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function canSeeNavItem(
  item: { permission?: OpsPermission; adminOnly?: boolean },
  role: OpsRole,
  permissions: readonly OpsPermission[]
): boolean {
  if (item.adminOnly) return role === "admin"
  if (item.permission) return role === "admin" || permissions.includes(item.permission)
  return true
}

/** Finance tabs (lives here, not in finance-view, so client code can import it without server queries). */
export const FINANCE_TABS = [
  { value: "overview", label: "Overview" },
  { value: "attention", label: "Needs attention" },
  { value: "ledger", label: "Ledger" },
  { value: "documents", label: "Invoices & quotes" },
  { value: "wallets", label: "Wallets" },
  { value: "payouts", label: "Payouts" },
  { value: "paystack", label: "Paystack" },
  { value: "tools", label: "Tool costs" },
]
