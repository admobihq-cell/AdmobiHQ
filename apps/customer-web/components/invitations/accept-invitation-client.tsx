"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { acceptOrgInvitation, OrgApiError } from "@/lib/org-client"

export function AcceptInvitationClient() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === "string" ? params.token : ""
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "accepting" | "done">("idle")
  const [conflict, setConflict] = useState<{
    currentOrgName: string
    campaignCount: number
    supportCaseCount: number
  } | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || status !== "idle" || conflict) return

    let cancelled = false
    setStatus("accepting")
    void acceptOrgInvitation(getToken, token)
      .then(({ org }) => {
        if (cancelled) return
        setStatus("done")
        toast.success(`You're now part of ${org.name}`, {
          description: `Joined as ${org.myRoleName}`,
        })
        router.replace("/settings/team")
      })
      .catch((err: OrgApiError) => {
        if (cancelled) return
        if (err.reason === "solo_org_conflict" && err.currentOrgName) {
          setConflict({
            currentOrgName: err.currentOrgName,
            campaignCount: err.campaignCount ?? 0,
            supportCaseCount: err.supportCaseCount ?? 0,
          })
        } else {
          setError(err.message)
        }
        setStatus("idle")
      })

    return () => {
      cancelled = true
    }
  }, [conflict, getToken, isLoaded, isSignedIn, router, status, token])

  function handleLeaveAndJoin() {
    setResolving(true)
    void acceptOrgInvitation(getToken, token, { leaveSoleOrg: true })
      .then(({ org }) => {
        toast.success(`You're now part of ${org.name}`, {
          description: `Joined as ${org.myRoleName}`,
        })
        router.replace("/settings/team")
      })
      .catch((err: Error) => {
        setResolving(false)
        setConflict(null)
        setError(err.message)
      })
  }

  if (!isLoaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!isSignedIn) {
    const returnTo = `/invitations/${token}`
    const loginHref = `/auth/login/advertiser?redirect_url=${encodeURIComponent(returnTo)}`
    const signUpHref = `/auth/signup/advertiser?redirect_url=${encodeURIComponent(returnTo)}`
    return (
      <Card className="mx-auto max-w-md shadow-none">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">Accept invitation</h1>
          <p className="text-sm text-muted-foreground">
            Use the email address this invitation was sent to — we match on it before adding you to
            the team.
          </p>
          <div className="flex flex-col gap-2">
            {/* Most invitees have never used Admobi, so creating an account is
                the primary action, not an afterthought. */}
            <Button asChild className="w-full">
              <Link href={signUpHref}>Create an account</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={loginHref}>I already have an account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (conflict) {
    const detached = [
      conflict.campaignCount > 0
        ? `${conflict.campaignCount} campaign${conflict.campaignCount === 1 ? "" : "s"}`
        : null,
      conflict.supportCaseCount > 0
        ? `${conflict.supportCaseCount} support case${conflict.supportCaseCount === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean)

    return (
      <Card className="mx-auto max-w-md shadow-none">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">You already have a workspace</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re the only member of <strong>{conflict.currentOrgName}</strong>. Leave it to
            join this invitation instead?
          </p>
          {detached.length ? (
            <p className="text-sm text-destructive">
              This permanently detaches {detached.join(" and ")} from your account. Ask an admin of{" "}
              {conflict.currentOrgName} to invite you back, or contact support first if you need
              them.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              variant={detached.length ? "destructive" : "default"}
              disabled={resolving}
              loading={resolving}
              loadingText="Joining…"
              onClick={handleLeaveAndJoin}
            >
              Leave {conflict.currentOrgName} and join
            </Button>
            <Button asChild variant="outline" disabled={resolving}>
              <Link href="/">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md shadow-none">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">Couldn&apos;t accept</h1>
          <p className="text-sm text-destructive">{error}</p>
          <Button asChild variant="outline">
            <Link href="/">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md shadow-none">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Joining team…</h1>
          <p className="text-sm text-muted-foreground">Accepting your invitation.</p>
        </div>
      </CardContent>
    </Card>
  )
}
