"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { acceptOrgInvitation } from "@/lib/org-client"

export function AcceptInvitationClient() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === "string" ? params.token : ""
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "accepting" | "done">("idle")

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || status !== "idle") return

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
