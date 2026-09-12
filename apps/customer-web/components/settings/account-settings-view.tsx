"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Laptop, Mail, Pencil, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react"
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
import {
  deleteOrganization,
  getOrgDeletionStatus,
} from "@/lib/org-client"
import { AccountSettingsSkeleton } from "@/components/skeletons/account-settings-skeleton"

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null, isLoaded: true }
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
  return {
    sessionId: null as string | null,
    signOut: async () => {},
    getToken: async () => null as string | null,
  }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

/** Clerk rejects a taken username or a malformed value with a structured
 * ClerkAPIError list rather than a plain Error. Surfacing that text matters —
 * "Save changes" silently doing nothing is the same dead end that made the
 * sign-up flow undebuggable. */
function clerkErrorMessage(error: unknown, fallback: string): string {
  const errors = (error as { errors?: unknown }).errors
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as { longMessage?: unknown; message?: unknown }
    if (typeof first.longMessage === "string") return first.longMessage
    if (typeof first.message === "string") return first.message
  }
  return fallback
}

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
  const { user, isLoaded } = useUserIfEnabled()
  const { sessionId, signOut, getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [username, setUsername] = useState(user?.username ?? "")
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false)

  const deletionStatusQuery = useQuery({
    queryKey: ["customer-org-deletion-status", user?.id],
    queryFn: () => getOrgDeletionStatus(getToken),
    enabled: Boolean(user?.deleteSelfEnabled),
    retry: false,
  })
  const isSoleOwner = deletionStatusQuery.data?.isSoleOwner === true
  const canDeleteAccount = deletionStatusQuery.data?.canDeleteAccount !== false

  const deleteOrgMutation = useMutation({
    mutationFn: () => deleteOrganization(getToken),
    onSuccess: async () => {
      setDeleteOrgOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["customer-org-deletion-status"] })
      await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
    },
  })

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const googleAccount = user?.externalAccounts?.find((account) => account.provider === "google")
  const initials = getInitials(fullName)
  const memberSince = formatMemberSince(user?.createdAt)

  const sessionsQueryKey = ["customer-clerk-sessions", user?.id, sessionId] as const
  const sessionsQuery = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      const list = await user!.getSessions()
      return list.map(
        (session): SessionRow => ({
          id: session.id,
          isCurrent: session.id === sessionId,
          label: sessionDeviceLabel(session.latestActivity),
          location: sessionLocation(session.latestActivity),
          lastActiveAt: session.lastActiveAt,
          revoke: () => session.revoke(),
        }),
      )
    },
    enabled: Boolean(user),
  })
  const sessions = sessionsQuery.data ?? null

  const updateProfileMutation = useMutation({
    mutationFn: (input: {
      firstName: string
      lastName: string
      username: string
    }) =>
      user!.update({
        firstName: input.firstName,
        lastName: input.lastName,
        // Clerk treats "" as "clear it"; only send a username when the instance
        // has the attribute enabled and the user actually typed one, otherwise
        // an untouched field would wipe an existing handle.
        ...(input.username ? { username: input.username } : {}),
      }),
    onSuccess: () => setEditing(false),
  })
  const saving = updateProfileMutation.isPending
  const saveError = updateProfileMutation.error

  const deleteAccountMutation = useMutation({
    mutationFn: () => user!.delete(),
    // A hard navigation rather than router.push: the Clerk client still holds a
    // session for a user that no longer exists, and a full reload is the one
    // thing guaranteed to clear it.
    onSuccess: () => window.location.assign("/auth/login"),
  })

  const revokeMutation = useMutation({
    mutationFn: (row: SessionRow) => row.revoke(),
    onSuccess: (_result, row) => {
      queryClient.setQueryData<SessionRow[]>(sessionsQueryKey, (prev) =>
        prev?.filter((s) => s.id !== row.id) ?? prev,
      )
    },
  })
  const revokingId = revokeMutation.isPending ? (revokeMutation.variables?.id ?? null) : null

  if (!isLoaded) return <AccountSettingsSkeleton />

  function startEditing() {
    setFirstName(user?.firstName ?? "")
    setLastName(user?.lastName ?? "")
    setUsername(user?.username ?? "")
    updateProfileMutation.reset()
    setEditing(true)
  }

  function handleSave() {
    if (!user) return
    updateProfileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
    })
  }
  function handleRevoke(row: SessionRow) {
    revokeMutation.mutate(row)
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
                  <p className="text-xs text-muted-foreground">
                    {user.username ? `@${user.username}` : "No username set"}
                  </p>
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
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="acmemedia"
                      autoComplete="username"
                      disabled={saving}
                    />
                  </div>
                </div>
                {saveError ? (
                  <p className="text-sm text-destructive">
                    {clerkErrorMessage(saveError, "Could not save those changes. Try again.")}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
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
                            onClick={() => handleRevoke(session)}
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

      {user?.deleteSelfEnabled ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Danger zone
          </p>
          <Card className="border-destructive/40 shadow-none">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Delete this account</p>
                  <p className="max-w-prose text-xs text-muted-foreground">
                    {isSoleOwner
                      ? "You're the only admin of this organization. Transfer admin in Team settings, or delete the organization, before deleting your account."
                      : "Removes your sign-in and profile permanently. Campaigns already booked stay on our records for billing and reporting — contact support to have those removed."}
                  </p>
                </div>
              </div>
              {isSoleOwner ? (
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href="/settings/team">Transfer in Team settings</a>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteOrgMutation.reset()
                      setDeleteOrgOpen(true)
                    }}
                  >
                    Delete organization
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="shrink-0"
                  disabled={!canDeleteAccount || deletionStatusQuery.isLoading}
                  onClick={() => {
                    deleteAccountMutation.reset()
                    setDeleteOpen(true)
                  }}
                >
                  Delete account
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AlertDialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this organization?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the team and memberships. Campaigns stay on our ops record (detached from the
              org). Afterward you can delete your personal account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteOrgMutation.error ? (
            <p className="text-sm text-destructive">
              {(deleteOrgMutation.error as Error).message || "Could not delete the organization."}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrgMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteOrgMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                deleteOrgMutation.mutate()
              }}
            >
              {deleteOrgMutation.isPending ? "Deleting…" : "Delete organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. You&apos;ll be signed out of every device and will need to
              sign up again to book new campaigns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteAccountMutation.error ? (
            <p className="text-sm text-destructive">
              {clerkErrorMessage(
                deleteAccountMutation.error,
                "Could not delete the account. Try again.",
              )}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteAccountMutation.isPending}
              onClick={(event) => {
                // Keep the dialog open while the request is in flight so the
                // error above has somewhere to render if Clerk refuses.
                event.preventDefault()
                deleteAccountMutation.mutate()
              }}
            >
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
