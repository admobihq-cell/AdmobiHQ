"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
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

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { readCompanyName } from "@/lib/company-name"
import { navItemForPath, visibleNavItems } from "@/lib/navigation"
import { customerTourChapters } from "@/lib/tour-chapters"
import { CompanyNamePrompt } from "@/components/shell/company-name-prompt"
import { NavUser } from "@/components/shell/nav-user"
import { NotificationBell } from "@/components/shell/notification-bell"

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null }
}

/** Same "pick the hook once at module load" pattern as nav-user.tsx —
 * useUser() must never run unless ClerkProvider is mounted. */
const useUserIfEnabled = isAuthEnabled() ? useSignedInUser : useNoUser

/** <CompanyNamePrompt>'s dialog fades out over `duration-100` (see the
 * data-closed:animate-out classes in packages/ui/src/components/dialog.tsx).
 * Handing the tour its go-ahead in the same commit the dialog closes opens it
 * underneath a scrim that is still on screen, so wait out the exit first.
 * ponytail: fixed settle matched to that declared duration — if the dialog's
 * transition gets longer, this has to grow with it. */
const PROMPT_EXIT_SETTLE_MS = 180

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
  const { user } = useUserIfEnabled()

  // Gates the product tour's first-run auto-open. <CompanyNamePrompt> below
  // opens for anyone who arrived without a company (Google sign-up, or an
  // account made before we asked); letting the tour auto-open behind that modal
  // put both on screen at once, with the dialog holding focus and its overlay
  // covering the sidebar items the tour points at.
  const companyKnown = Boolean(readCompanyName(user?.unsafeMetadata))
  const [tourReady, setTourReady] = useState(false)

  useEffect(() => {
    if (!companyKnown || tourReady) return
    const timer = setTimeout(() => setTourReady(true), PROMPT_EXIT_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [companyKnown, tourReady])

  return (
    <TourProvider
      app="customer"
      userId={user?.id ?? null}
      chapters={customerTourChapters}
      autoStartReady={tourReady}
    >
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
            <div className="ml-auto flex items-center gap-1">
              {isAuthEnabled() ? <NotificationBell /> : null}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </main>
          {isAuthEnabled() ? <CompanyNamePrompt /> : null}
        </SidebarInset>
      </SidebarProvider>
    </TourProvider>
  )
}
