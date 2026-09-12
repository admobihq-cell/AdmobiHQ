"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { acceptOrgInvitation } from "@/lib/org-client"

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return {
    isLoaded: true,
    isSignedIn: false,
    getToken: async () => null as string | null,
  }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

export function AcceptInvitationClient() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === "string" ? params.token : ""
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuthIfEnabled()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "accepting" | "done">("idle")

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || status !== "idle") return

    let cancelled = false
    setStatus("accepting")
    void acceptOrgInvitation(getToken, token)
      .then(() => {
        if (cancelled) return
        setStatus("done")
        router.replace("/settings/team")
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
        setStatus("idle")
      })

    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, isSignedIn, router, status, token])

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
      <CardContent className="space-y-2 p-6">
        <h1 className="text-xl font-semibold">Joining team…</h1>
        <p className="text-sm text-muted-foreground">Accepting your invitation.</p>
      </CardContent>
    </Card>
  )
}
