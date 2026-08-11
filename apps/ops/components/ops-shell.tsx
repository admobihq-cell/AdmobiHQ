"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Car,
  FileText,
  Home,
  History,
  LifeBuoy,
  Mail,
  Map,
  Megaphone,
  Radio,
  Settings,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { Logo } from "@workspace/ui/brand/logo"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"
import { ThemeToggle } from "@workspace/ui/components/theme-toggle"

const navItems: Array<{
  href: string
  label: string
  icon: typeof Home
  permission?: OpsPermission
}> = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/map", label: "Map", icon: Map },
  { href: "/leads", label: "Campaign Leads", icon: Megaphone, permission: "leads" },
  { href: "/fleet", label: "Fleet Partners", icon: Truck, permission: "fleet" },
  { href: "/drivers", label: "Drivers", icon: Car, permission: "drivers" },
  { href: "/finances", label: "Finances", icon: Wallet, permission: "finances" },
  { href: "/waitlist", label: "Waitlist", icon: Mail, permission: "waitlist" },
  { href: "/media-kit", label: "Media Kit", icon: FileText, permission: "media_kit" },
  { href: "/announcements", label: "Announcements", icon: Radio, permission: "announcements" },
  { href: "/support", label: "Support", icon: LifeBuoy, permission: "support" },
  { href: "/activity", label: "Activity", icon: History, permission: "activity" },
]

const secondaryItems: Array<{
  href: string
  label: string
  icon: typeof Users
  permission?: OpsPermission
  adminOnly?: boolean
}> = [
  { href: "/content", label: "Content (CMS)", icon: Users, permission: "content" },
  { href: "/team", label: "Team", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, permission: "flags" },
]

const allNavItems = [...navItems, ...secondaryItems]

const activeSidebarLinkClassName =
  "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:hover:bg-primary/15 data-[active=true]:[&>svg]:text-primary"

/** Matches nested routes too (e.g. /support/42 under /support), not just an exact pathname. */
function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function OpsBreadcrumbs({ pathname }: { pathname: string }) {
  const current =
    allNavItems.find((item) => isNavItemActive(pathname, item.href))?.label ?? "Home"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/home">Ops</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function OpsShell({
  children,
  role,
  permissions,
  userName,
  orgName,
}: {
  children: React.ReactNode
  role: OpsRole
  permissions: OpsPermission[]
  userName: string
  orgName: string | null
}) {
  const pathname = usePathname()
  const canSee = (item: { permission?: OpsPermission; adminOnly?: boolean }) => {
    if (item.adminOnly) return role === "admin"
    if (item.permission) return role === "admin" || permissions.includes(item.permission)
    return true
  }
  const visibleNavItems = navItems.filter(canSee)
  const visibleSecondaryItems = secondaryItems.filter(canSee)

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="h-12 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Logo
              markHeight={16}
              wordmarkClassName="text-sm leading-none group-data-[collapsible=icon]:hidden"
            />
            <span className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
              · Ops Console
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavItemActive(pathname, item.href)}
                      className={activeSidebarLinkClassName}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Content</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleSecondaryItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavItemActive(pathname, item.href)}
                      className={activeSidebarLinkClassName}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <UserButton />
            <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {orgName ?? "Admobi Ops"}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <OpsBreadcrumbs pathname={pathname} />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
