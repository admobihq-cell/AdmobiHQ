"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { Building2 } from "lucide-react"

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

import type { AdvertiserOrgDto } from "@workspace/ops-contracts"

import { getOrg } from "@/lib/org-client"
import { navItemForPath, visibleNavItems } from "@/lib/navigation"
import { customerTourChapters } from "@/lib/tour-chapters"
import { NavUser } from "@/components/shell/nav-user"
import { NotificationBell } from "@/components/shell/notification-bell"
import { OrgNameNudge } from "@/components/shell/org-name-nudge"

const activeSidebarLinkClassName =
  "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:hover:bg-primary/15 data-[active=true]:[&>svg]:text-primary"

function AppBreadcrumbs({ pathname }: { pathname: string }) {
  const current = navItemForPath(pathname).label

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">App</Link>
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
}: {
  children: React.ReactNode
  enabledFlags: string[]
}) {
  const pathname = usePathname()
  const currentNavHref = navItemForPath(pathname).href
  const navItems = visibleNavItems(new Set(enabledFlags))
  const { user } = useUser()
  const { getToken } = useAuth()

  const [org, setOrg] = useState<AdvertiserOrgDto | null>(null)

  useEffect(() => {
    if (!user) {
      setOrg(null)
      return
    }
    let cancelled = false
    void getOrg(getToken)
      .then((o) => {
        if (!cancelled) setOrg(o)
      })
      .catch(() => {})

    // Fast path: <TeamSettingsView>'s rename dispatches the new name so the
    // header updates instantly, without waiting on a refetch.
    function onNamed(event: Event) {
      const detail = (event as CustomEvent<{ name?: string }>).detail
      if (typeof detail?.name === "string" && detail.name.trim()) {
        setOrg((prev) => (prev ? { ...prev, name: detail.name!.trim() } : prev))
        return
      }
      void getOrg(getToken).then((o) => {
        if (!cancelled) setOrg(o)
      })
    }
    window.addEventListener("customer-org-named", onNamed)
    return () => {
      cancelled = true
      window.removeEventListener("customer-org-named", onNamed)
    }
  }, [getToken, user])

  const orgName = org?.name.trim() || null

  return (
    <TourProvider app="customer" userId={user?.id ?? null} chapters={customerTourChapters}>
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
                · Customer App
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Product</SidebarGroupLabel>
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
          <SidebarFooter className="border-t border-sidebar-border p-2">
            <NavUser />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumbs pathname={pathname} />
            <div className="ml-auto flex min-w-0 items-center gap-2">
              {orgName ? (
                <OrgNameNudge org={org}>
                  <Link
                    href="/settings/team"
                    title={orgName}
                    className="group hidden max-w-[12rem] items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-left transition-colors hover:border-border hover:bg-muted sm:flex md:max-w-[16rem]"
                  >
                    <Building2
                      className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden
                    />
                    <span className="truncate text-xs font-medium tracking-tight text-foreground/90">
                      {orgName}
                    </span>
                  </Link>
                </OrgNameNudge>
              ) : null}
              <NotificationBell />
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
