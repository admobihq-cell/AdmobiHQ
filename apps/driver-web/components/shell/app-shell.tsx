"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"

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

import { navItemForPath, visibleNavItems } from "@/lib/navigation"
import { driverTourChapters } from "@/lib/tour-chapters"
import { BottomTabs } from "@/components/shell/bottom-tabs"
import { NavUser } from "@/components/shell/nav-user"
import { DriverCommandPalette } from "@/components/shell/driver-command-palette"
import { LiveUpdates } from "@/components/shell/live-updates"
import { NotificationBell } from "@/components/shell/notification-bell"
import { SosFab } from "@/components/shell/sos-fab"
import { VerificationBadge } from "@/components/shell/verification-badge"

const activeSidebarLinkClassName =
  "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:hover:bg-primary/15 data-[active=true]:[&>svg]:text-primary"

function DriverBreadcrumbs({ pathname }: { pathname: string }) {
  const current = navItemForPath(pathname).label

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Driver</Link>
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

export function AppShell({
  children,
  enabledFlags,
  profileStatus,
}: {
  children: React.ReactNode
  enabledFlags: string[]
  profileStatus: string | null
}) {
  const pathname = usePathname()
  const currentNavHref = navItemForPath(pathname).href
  const navItems = visibleNavItems(new Set(enabledFlags))
  const { user } = useUser()

  return (
    <TourProvider
      app="driver"
      userId={user?.id ?? null}
      chapters={driverTourChapters}
    >
      <SidebarProvider className="print:[&_[data-slot=sidebar]]:hidden">
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
                · Driver App
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.href === currentNavHref}
                        className={activeSidebarLinkClassName}
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          data-tour-id={`tour-nav-${item.label.toLowerCase()}`}
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
          <SidebarFooter className="gap-2 border-t border-sidebar-border p-2">
            <VerificationBadge status={profileStatus} />
            <NavUser />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 print:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DriverBreadcrumbs pathname={pathname} />
            <div className="ml-auto flex items-center gap-1">
              <DriverCommandPalette enabledFlags={enabledFlags} />
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <LiveUpdates />
          {/* Bottom padding clears the tab bar + SOS button on phones, and the SOS button on desktop. */}
          <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col gap-4 p-4 pb-40 md:p-6 md:pb-24">
            {children}
          </main>
        </SidebarInset>
        <BottomTabs items={navItems} currentHref={currentNavHref} />
        {/* Overlays every page under (shell). Mounted once here rather than
            per-page so a page added later gets it for free. Not flag-gated —
            reporting an accident must not depend on a toggle. */}
        <SosFab />
      </SidebarProvider>
    </TourProvider>
  )
}
