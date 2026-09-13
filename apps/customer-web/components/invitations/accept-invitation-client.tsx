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
  const [conflict, setConflict] = useState<{ currentOrgName: string } | null>(null)
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
          setConflict({ currentOrgName: err.currentOrgName })
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
    const loginHref = `/auth/login/advertiser?redirect_url=${encodeURIComponent(`/invitations/${token}`)}`
    return (
      <Card className="mx-auto max-w-md shadow-none">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">Accept invitation</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the email address this invitation was sent to, then we&apos;ll add you to
            the team.
          </p>
          <Button asChild className="w-full">
            <Link href={loginHref}>Sign in to accept</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (conflict) {
    return (
      <Card className="mx-auto max-w-md shadow-none">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">You already have a workspace</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re the only member of <strong>{conflict.currentOrgName}</strong> — it was
            created automatically when you signed up. Leave it to join this invitation instead?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
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
