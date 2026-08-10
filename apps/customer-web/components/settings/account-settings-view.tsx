"use client"

import { useEffect, useState } from "react"
import { Laptop, Mail, Pencil, ShieldCheck, Smartphone } from "lucide-react"
import { useAuth, useUser } from "@clerk/nextjs"

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
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { GoogleIcon } from "@workspace/ui/components/google-icon"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null }
}

/**
 * Same "pick the hook once at module load" pattern as customer-session.ts —
 * useUser() / useAuth() must never run unless ClerkProvider is mounted.
 */
const useUserIfEnabled = isAuthEnabled() ? useSignedInUser : useNoUser

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return { sessionId: null as string | null, signOut: async () => {} }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatMemberSince(date: Date | null | undefined): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)
}

function formatRelativeTime(date: Date): string {
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return "Active now"
  if (diffMin < 60) return `Active ${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `Active ${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `Active ${diffDay}d ago`
}

type SessionActivity = {
  browserName?: string
  deviceType?: string
  isMobile?: boolean
  city?: string
  country?: string
}

function sessionDeviceLabel(activity: SessionActivity | undefined): string {
  if (!activity) return "Unknown device"
  if (activity.browserName) {
    return `${activity.browserName} · ${activity.isMobile ? "Mobile" : "Desktop"}`
  }
  if (activity.isMobile) return "Mobile app"
  return activity.deviceType || "Unknown device"
}

function sessionLocation(activity: SessionActivity | undefined): string | null {
  if (!activity) return null
  return [activity.city, activity.country].filter(Boolean).join(", ") || null
}

type SessionRow = {
  id: string
  isCurrent: boolean
  label: string
  location: string | null
  lastActiveAt: Date
  revoke: () => Promise<unknown>
}

export function AccountSettingsView() {
  const { user } = useUserIfEnabled()
  const { sessionId, signOut } = useAuthIfEnabled()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const googleAccount = user?.externalAccounts?.find((account) => account.provider === "google")
  const initials = getInitials(fullName)
  const memberSince = formatMemberSince(user?.createdAt)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user
      .getSessions()
      .then((list) => {
        if (cancelled) return
        setSessions(
          list.map((session) => ({
            id: session.id,
            isCurrent: session.id === sessionId,
            label: sessionDeviceLabel(session.latestActivity),
            location: sessionLocation(session.latestActivity),
            lastActiveAt: session.lastActiveAt,
            revoke: () => session.revoke(),
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
    return () => {
      cancelled = true
    }
  }, [user, sessionId])

  function startEditing() {
    setFirstName(user?.firstName ?? "")
    setLastName(user?.lastName ?? "")
    setEditing(true)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(row: SessionRow) {
    setRevokingId(row.id)
    try {
      await row.revoke()
      setSessions((prev) => prev?.filter((s) => s.id !== row.id) ?? prev)
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Profile & sign-in</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your identity, sign-in methods, and active sessions for this account.
        </p>
      </div>

      {user ? (
        <Card className="shadow-none">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={fullName} /> : null}
                  <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{fullName || "Add your name"}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{email}</span>
                    {emailVerified ? (
                      <ShieldCheck
                        className="size-3.5 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  {memberSince ? (
                    <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
                  ) : null}
                </div>
              </div>
              {!editing ? (
                <Button type="button" variant="outline" size="sm" onClick={startEditing}>
                  <Pencil aria-hidden />
                  Edit
                </Button>
              ) : null}
            </div>

            {editing ? (
              <div className="space-y-4 border-t pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First name</Label>
                    <Input
                      id="first-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last name</Label>
                    <Input
                      id="last-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    loading={saving}
                    loadingText="Saving…"
                  >
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm font-semibold">Browsing anonymously</p>
            <p className="text-sm text-muted-foreground">
              You&apos;re using this device without an account — no sign-in required yet.
            </p>
          </CardContent>
        </Card>
      )}

      {user ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sign-in methods
          </p>
          <Card className="overflow-hidden p-0 shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Mail className="size-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Email code</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email}
                    {emailVerified ? " · Verified" : ""}
                  </p>
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <GoogleIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Google</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {googleAccount
                      ? `Connected · ${googleAccount.emailAddress ?? email ?? ""}`
                      : "Not connected"}
                  </p>
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <ShieldCheck className="size-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">
                    {user.twoFactorEnabled ? "On" : "Off"} — Admobi uses passwordless sign-in, so
                    there&apos;s no password to pair it with yet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {user ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active sessions
          </p>
          <Card className="overflow-hidden p-0 shadow-none">
            <CardContent className="p-0">
              {sessions === null ? (
                <div className="space-y-3 p-4">
                  <div className="h-10 animate-pulse rounded-lg bg-muted" />
                  <div className="h-10 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : (
                sessions.map((session, index) => {
                  const Icon = session.label.toLowerCase().includes("mobile") ? Smartphone : Laptop
                  return (
                    <div key={session.id}>
                      {index > 0 ? <div className="border-t" /> : null}
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="size-4 text-primary" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {session.label}
                            {session.isCurrent ? (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                This device
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[session.location, formatRelativeTime(session.lastActiveAt)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {!session.isCurrent ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRevoke(session)}
                            loading={revokingId === session.id}
                            loadingText="Signing out…"
                          >
                            Sign out
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setSignOutOpen(true)}
          >
            Sign out of this device
          </Button>
        </div>
      ) : null}

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to sign in again to access your campaigns.
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
    </div>
  )
}
