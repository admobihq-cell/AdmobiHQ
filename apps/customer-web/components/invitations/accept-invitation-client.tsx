"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { AdvertiserInvitationPreviewDto } from "@workspace/ops-contracts"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import {
  acceptOrgInvitation,
  declineOrgInvitation,
  getOrgInvitationPreview,
  OrgApiError,
} from "@/lib/org-client"

function detachedSummary(preview: AdvertiserInvitationPreviewDto): string | null {
  const parts = [
    preview.campaignCount
      ? `${preview.campaignCount} campaign${preview.campaignCount === 1 ? "" : "s"}`
      : null,
    preview.supportCaseCount
      ? `${preview.supportCaseCount} support case${preview.supportCaseCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" and ") : null
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mx-auto max-w-md shadow-none">
      <CardContent className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
      </CardContent>
    </Card>
  )
}

/**
 * Joining an organization is never automatic. The invitee sees who invited
 * them, to what, and what accepting would cost them, then chooses Accept or
 * Decline — an invite link opened out of curiosity must not move anyone's
 * account, least of all delete a workspace.
 */
export function AcceptInvitationClient() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === "string" ? params.token : ""
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [declined, setDeclined] = useState(false)

  const previewQuery = useQuery({
    queryKey: ["org-invitation-preview", token, isSignedIn],
    queryFn: () => getOrgInvitationPreview(getToken, token),
    enabled: isLoaded && Boolean(token),
    retry: false,
  })

  const accept = useMutation({
    mutationFn: (options?: { leaveSoleOrg?: boolean }) =>
      acceptOrgInvitation(getToken, token, options),
    onSuccess: async ({ org }) => {
      toast.success(`You're now part of ${org.name}`, { description: `Joined as ${org.myRoleName}` })
      // The shell and dashboard read these; joining changed both org and roster.
      await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
      await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
      router.replace("/")
    },
    onError: (err: OrgApiError) => setError(err.message),
  })

  const decline = useMutation({
    mutationFn: () => declineOrgInvitation(getToken, token),
    onSuccess: () => setDeclined(true),
    onError: (err: OrgApiError) => setError(err.message),
  })

  if (!isLoaded || previewQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <Shell title="This invitation isn't available">
        <p className="text-sm text-destructive">
          {(previewQuery.error as OrgApiError | null)?.message ?? "It may have expired or been withdrawn."}
        </p>
        <Button asChild variant="outline">
          <Link href="/">Go to dashboard</Link>
        </Button>
      </Shell>
    )
  }

  const preview = previewQuery.data
  const returnTo = `/invitations/${token}`

  if (declined) {
    return (
      <Shell title="Invitation declined">
        <p className="text-sm text-muted-foreground">
          Nothing about your account changed. Ask {preview.inviterName} for a new invitation if you
          change your mind.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Go to dashboard</Link>
        </Button>
      </Shell>
    )
  }

  const invitedTo = (
    <p className="text-sm text-muted-foreground">
      <strong className="text-foreground">{preview.inviterName}</strong> invited you to join{" "}
      <strong className="text-foreground">{preview.orgName}</strong>
      {preview.roleName ? ` as ${preview.roleName}` : ""}, at {preview.email}.
    </p>
  )

  if (!isSignedIn) {
    return (
      <Shell title={`Join ${preview.orgName}`}>
        {invitedTo}
        <p className="text-sm text-muted-foreground">
          Use that address to continue — we match on it before adding you to the team.
        </p>
        <div className="flex flex-col gap-2">
          {/* Most invitees have never used Admobi, so creating an account is
              the primary action, not an afterthought. */}
          <Button asChild className="w-full">
            <Link href={`/auth/signup/advertiser?redirect_url=${encodeURIComponent(returnTo)}`}>
              Create an account
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/auth/login/advertiser?redirect_url=${encodeURIComponent(returnTo)}`}>
              I already have an account
            </Link>
          </Button>
        </div>
      </Shell>
    )
  }

  if (preview.emailMismatch) {
    return (
      <Shell title="Wrong account">
        {invitedTo}
        <p className="text-sm text-destructive">
          You&apos;re signed in with a different email address. Sign in as {preview.email} to accept.
        </p>
        <Button asChild variant="outline">
          <Link href={`/auth/login/advertiser?redirect_url=${encodeURIComponent(returnTo)}`}>
            Switch account
          </Link>
        </Button>
      </Shell>
    )
  }

  if (preview.conflict === "existing_team") {
    return (
      <Shell title="You're already in an organization">
        {invitedTo}
        <p className="text-sm text-muted-foreground">
          You belong to <strong>{preview.currentOrgName ?? "another organization"}</strong>, which
          has other members. Leave it from Settings — or transfer admin first, if you&apos;re the
          admin — before joining a different one.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/settings/account">Go to Settings</Link>
          </Button>
          <Button
            variant="ghost"
            disabled={decline.isPending}
            loading={decline.isPending}
            loadingText="Declining…"
            onClick={() => decline.mutate()}
          >
            Decline invitation
          </Button>
        </div>
      </Shell>
    )
  }

  const replacesWorkspace =
    preview.conflict === "empty_solo_org" || preview.conflict === "solo_org_with_content"
  const losesWork = preview.conflict === "solo_org_with_content"
  const detached = detachedSummary(preview)

  return (
    <Shell title={`Join ${preview.orgName}?`}>
      {invitedTo}

      {preview.conflict === "empty_solo_org" ? (
        <p className="text-sm text-muted-foreground">
          Accepting replaces <strong>{preview.currentOrgName}</strong> — the empty workspace created
          for you at sign-up. There&apos;s nothing in it.
        </p>
      ) : null}

      {losesWork ? (
        <p className="text-sm text-destructive">
          Accepting deletes <strong>{preview.currentOrgName}</strong>
          {detached ? `, permanently detaching ${detached}` : ""}. That can&apos;t be undone —
          contact support first if you still need them.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          variant={losesWork ? "destructive" : "default"}
          disabled={accept.isPending || decline.isPending}
          loading={accept.isPending}
          loadingText="Joining…"
          onClick={() => accept.mutate(replacesWorkspace ? { leaveSoleOrg: true } : undefined)}
        >
          {losesWork ? "Delete workspace and join" : "Accept invitation"}
        </Button>
        <Button
          variant="outline"
          disabled={accept.isPending || decline.isPending}
          loading={decline.isPending}
          loadingText="Declining…"
          onClick={() => decline.mutate()}
        >
          Decline
        </Button>
      </div>
    </Shell>
  )
}
