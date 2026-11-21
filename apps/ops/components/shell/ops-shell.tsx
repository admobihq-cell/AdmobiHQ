"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { Badge } from "@workspace/ui/components/badge"
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
import { TourProvider } from "@workspace/ui/components/tour-provider"

import { NotificationBell } from "@/components/shell/notification-bell"
import { OpsCommandPalette } from "@/components/shell/ops-command-palette"
import {
  allNavItems,
  canSeeNavItem,
  dashboardNavItems,
  isNavItemActive,
  navItems,
  secondaryItems,
  type NavItem,
} from "@/lib/navigation"
import { opsTourChapters } from "@/lib/tour-chapters"

const activeSidebarLinkClassName =
  "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:hover:bg-primary/15 data-[active=true]:[&>svg]:text-primary"

function tourSlug(href: string): string {
  return href.replace(/^\//, "").replace(/\//g, "-")
}

function OpsBreadcrumbs({ pathname }: { pathname: string }) {
  const current =
    allNavItems.find((item) => isNavItemActive(pathname, item.href))?.label ??
    "Home"

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
  userId,
  pendingCounts = {},
}: {
  children: React.ReactNode
  role: OpsRole
  permissions: OpsPermission[]
  userName: string
  orgName: string | null
  userId: string
  /** Review-queue badge counts, keyed by nav href. Ops's review queues double
   * as its notification inbox, so this is the only "unread count" the app has.
   * Keyed rather than named per section: a third hardcoded branch here was the
   * wrong shape. */
  pendingCounts?: Partial<Record<string, number>>
}) {
  const pathname = usePathname()
  const canSee = (item: { permission?: OpsPermission; adminOnly?: boolean }) =>
    canSeeNavItem(item, role, permissions)
  const canSeeNotifications =
    role === "admin" ||
    (
      [
        "driver_applications",
        "campaigns",
        "support",
        "leads",
        "fleet",
        "drivers",
        "waitlist",
        "media_kit",
      ] as OpsPermission[]
    ).some((permission) => permissions.includes(permission))
  const visibleDashboardItems = dashboardNavItems.filter(canSee)
  const visibleNavItems = navItems.filter(canSee)
  const visibleSecondaryItems = secondaryItems.filter(canSee)

  const renderGroup = (label: string, items: NavItem[]) =>
    items.length === 0 ? null : (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isNavItemActive(pathname, item.href)}
                  className={activeSidebarLinkClassName}
                  tooltip={item.label}
                >
                  <Link href={item.href} data-tour-id={`tour-nav-${tourSlug(item.href)}`}>
                    <item.icon />
                    <span>{item.label}</span>
                    {(pendingCounts[item.href] ?? 0) > 0 ? (
                      <Badge
                        variant="secondary"
                        className="ml-auto bg-amber-100 text-amber-800 group-data-[collapsible=icon]:hidden dark:bg-amber-950 dark:text-amber-200"
                      >
                        {pendingCounts[item.href]}
                      </Badge>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )

  return (
    <TourProvider app="ops" userId={userId} chapters={opsTourChapters}>
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader className="h-12 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-0">
            <div
              data-tour-id="tour-logo"
              className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
            >
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
            {renderGroup("Dashboards", visibleDashboardItems)}
            {renderGroup("Operations", visibleNavItems)}
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
                        <Link
                          href={item.linkHref ?? item.href}
                          data-tour-id={`tour-nav-${tourSlug(item.href)}`}
                        >
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
            <div className="ml-auto flex items-center gap-1">
              <OpsCommandPalette role={role} permissions={permissions} userId={userId} />
              {canSeeNotifications ? (
                <NotificationBell role={role} permissions={permissions} />
              ) : null}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TourProvider>
  )
}
