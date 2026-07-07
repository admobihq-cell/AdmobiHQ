"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Car,
  FileText,
  LayoutDashboard,
  Mail,
  Megaphone,
  Truck,
  Users,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

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

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/leads", label: "Campaign Leads", icon: Megaphone },
  { href: "/fleet", label: "Fleet Partners", icon: Truck },
  { href: "/drivers", label: "Drivers", icon: Car },
  { href: "/waitlist", label: "Waitlist", icon: Mail },
  { href: "/media-kit", label: "Media Kit", icon: FileText },
]

const secondaryItems = [
  { href: "/content", label: "Content (CMS)", icon: Users },
]

export function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admobi
            </span>
            <span className="text-sm font-semibold">Ops Console</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
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
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
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
          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/sign-in" />
            <span className="text-xs text-muted-foreground">@admobihq.com</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">ops.admobihq.com</span>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
