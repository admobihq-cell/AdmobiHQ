"use client"

import Link from "next/link"
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

function clerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    return (err as { errors: Array<{ message?: string }> }).errors[0]?.message ?? fallback
  }
  return fallback
}

export function AdvertiserSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthEnabled()) {
    return <AuthDisabledMessage />
  }

  async function handleSendCode() {
    if (!isLoaded || !signIn || !email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signIn.create({ identifier: email.trim() })
      const emailCodeFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      ) as { strategy: "email_code"; emailAddressId: string } | undefined

      if (!emailCodeFactor) {
        setError("Email verification is not available for this account.")
        return
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailCodeFactor.emailAddressId,
      })
      setCode("")
      setStep("code")
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not send verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode() {
    if (!isLoaded || !signIn || code.trim().length < CODE_LENGTH) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      })
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId })
        return
      }
      setError("Sign-in could not be completed. Try again.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Invalid verification code."))
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    if (!isLoaded || !signIn) return
    setError(null)
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth/sso-callback/advertiser",
        redirectUrlComplete: "/",
      })
    } catch (err) {
      setError(clerkErrorMessage(err, "Google sign-in failed."))
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
            disabled={submitting || !isLoaded || !email.trim()}
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
