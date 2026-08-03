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
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

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

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/map", label: "Map", icon: Map },
  { href: "/leads", label: "Campaign Leads", icon: Megaphone },
  { href: "/fleet", label: "Fleet Partners", icon: Truck },
  { href: "/drivers", label: "Drivers", icon: Car },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/waitlist", label: "Waitlist", icon: Mail },
  { href: "/media-kit", label: "Media Kit", icon: FileText },
  { href: "/announcements", label: "Announcements", icon: Radio },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/activity", label: "Activity", icon: History },
]

const secondaryItems = [
  { href: "/content", label: "Content (CMS)", icon: Users },
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

export function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
                {navItems.map((item) => (
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
                {secondaryItems.map((item) => (
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
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              @admobihq.com
            </span>
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
