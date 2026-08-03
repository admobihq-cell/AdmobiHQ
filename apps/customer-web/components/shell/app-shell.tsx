"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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

import { appNavItems, isNavItemActive, navItemForPath } from "@/lib/navigation"
import { appHostLabel } from "@/lib/site-urls"

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

export function AppShell({ children }: { children: React.ReactNode }) {
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
              · Customer App
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Product</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {appNavItems.map((item) => (
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
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {appHostLabel()}
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AppBreadcrumbs pathname={pathname} />
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
