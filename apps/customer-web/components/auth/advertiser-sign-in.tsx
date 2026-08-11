"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"

import { AuthLegalLine } from "@workspace/ui/components/auth-legal-line"
import { AuthSplitShell } from "@workspace/ui/components/auth-split-shell"
import { Button } from "@workspace/ui/components/button"
import { GoogleIcon } from "@workspace/ui/components/google-icon"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { webPublicUrl } from "@/lib/site-urls"

import { AuthDisabledMessage } from "@/components/auth/auth-disabled-message"

const CODE_LENGTH = 6
const HERO_PHOTO_SRC = "/auth/hero-advertiser.jpg"

function useDisabledSignIn(): { signIn: null } {
  return { signIn: null }
}

/**
 * Same "pick the hook once at module load" pattern as customer-session.ts —
 * useSignIn() must never run unless ClerkProvider is mounted.
 */
const useSignInIfEnabled = isAuthEnabled() ? useSignIn : useDisabledSignIn

export function AdvertiserSignIn() {
  const { signIn } = useSignInIfEnabled()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthEnabled()) {
    return <AuthDisabledMessage />
  }

  async function handleSendCode() {
    if (!signIn || !email.trim()) return
    setSubmitting(true)
    setError(null)

    const { error: createError } = await signIn.create({ identifier: email.trim() })
    if (createError) {
      setError(createError.longMessage ?? createError.message ?? "Could not send verification code.")
      setSubmitting(false)
      return
    }

    const emailCodeSupported = signIn.supportedFirstFactors.some(
      (factor) => factor.strategy === "email_code",
    )
    if (!emailCodeSupported) {
      setError("Email verification is not available for this account.")
      setSubmitting(false)
      return
    }

    const { error: sendError } = await signIn.emailCode.sendCode({})
    if (sendError) {
      setError(sendError.longMessage ?? sendError.message ?? "Could not send verification code.")
      setSubmitting(false)
      return
    }

    setCode("")
    setStep("code")
    setSubmitting(false)
  }

  async function handleVerifyCode() {
    if (!signIn || code.trim().length < CODE_LENGTH) return
    setSubmitting(true)
    setError(null)

    const { error: verifyError } = await signIn.emailCode.verifyCode({ code: code.trim() })
    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message ?? "Invalid verification code.")
      setCode("")
      setSubmitting(false)
      return
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: () => {
          router.push("/")
        },
      })
      return
    }

    setError("Sign-in could not be completed. Try again.")
    setSubmitting(false)
  }

  async function handleGoogleSignIn() {
    if (!signIn) return
    setError(null)

    const { error: ssoError } = await signIn.sso({
      strategy: "oauth_google",
      redirectCallbackUrl: "/auth/sso-callback/advertiser",
      redirectUrl: "/",
    })
    if (ssoError) {
      setError(ssoError.longMessage ?? ssoError.message ?? "Google sign-in failed.")
    }
  }

  return (
    <AuthSplitShell
      photoSrc={HERO_PHOTO_SRC}
      photoAlt="A Nairobi street at golden hour"
      statement="Book screens that move with the city."
      statementDetail="Zones, schedule, and spend for taxi-top campaigns across Nairobi — one place to run it all."
    >
      {step === "code" ? (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-heading text-xl font-medium">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              Enter the {CODE_LENGTH}-digit code sent to {email.trim()}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              maxLength={CODE_LENGTH}
              disabled={submitting}
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            className="w-full"
            size="lg"
            disabled={submitting || code.trim().length < CODE_LENGTH}
            loading={submitting}
            loadingText="Verifying…"
            onClick={() => void handleVerifyCode()}
          >
            Verify and sign in
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={() => {
              setStep("email")
              setCode("")
              setError(null)
            }}
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-heading text-xl font-medium">Sign in to Admobi</h1>
            <p className="text-sm text-muted-foreground">We&apos;ll email you a one-time code.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            className="w-full"
            size="lg"
            disabled={submitting || !signIn || !email.trim()}
            loading={submitting}
            loadingText="Sending…"
            onClick={() => void handleSendCode()}
          >
            Send code
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => void handleGoogleSignIn()}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>
          <AuthLegalLine
            termsHref={`${webPublicUrl()}/terms`}
            privacyHref={`${webPublicUrl()}/privacy`}
          />
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup/advertiser"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      )}
    </AuthSplitShell>
  )
}
