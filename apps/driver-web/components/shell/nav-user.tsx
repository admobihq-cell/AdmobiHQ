"use client"

import { useState } from "react"
import Link from "next/link"
import { useClerk, useUser } from "@clerk/nextjs"
import { ChevronsUpDown, LogOut, UserCircle } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { driverHostLabel } from "@/lib/site-urls"

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null }
}

/**
 * Same "pick the hook once at module load" pattern as driver-session.ts —
 * useUser() must never run unless ClerkProvider is mounted.
 */
const useUserIfEnabled = isAuthEnabled() ? useSignedInUser : useNoUser

function useSignOut() {
  const { signOut } = useClerk()
  return signOut
}

function useNoSignOut() {
  return async () => {}
}

const useSignOutIfEnabled = isAuthEnabled() ? useSignOut : useNoSignOut

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useUserIfEnabled()
  const signOut = useSignOutIfEnabled()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const displayName = fullName || (user ? "Add your name" : "Browsing anonymously")
  const displaySubtitle = email ?? driverHostLabel()
  const initials = getInitials(fullName)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar size="sm" className="rounded-lg">
                  {user?.imageUrl ? <AvatarImage src={user.imageUrl} alt={displayName} /> : null}
                  <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                    {initials || <UserCircle className="size-4" aria-hidden />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displaySubtitle}
                  </span>
                </div>
                <ChevronsUpDown
                  className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden"
                  aria-hidden
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1.5 py-1.5 text-left text-sm">
                  <Avatar size="sm" className="rounded-lg">
                    {user?.imageUrl ? (
                      <AvatarImage src={user.imageUrl} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                      {initials || <UserCircle className="size-4" aria-hidden />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {displaySubtitle}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/account">
                  <UserCircle aria-hidden />
                  Profile & sign-in
                </Link>
              </DropdownMenuItem>
              {user ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => {
                      event.preventDefault()
                      setConfirmOpen(true)
                    }}
                  >
                    <LogOut aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to sign in again to access your deliveries and earnings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void signOut()}>
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
