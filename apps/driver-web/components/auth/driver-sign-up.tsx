"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSignUp } from "@clerk/nextjs"

import { AuthLegalLine } from "@workspace/ui/components/auth-legal-line"
import { AuthSplitShell } from "@workspace/ui/components/auth-split-shell"
import { Button } from "@workspace/ui/components/button"
import { GoogleIcon } from "@workspace/ui/components/google-icon"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { appPublicUrl, webPublicUrl } from "@/lib/site-urls"

import { AuthDisabledMessage } from "@/components/auth/auth-disabled-message"

const CODE_LENGTH = 6
const HERO_PHOTO_SRC = "/auth/hero-driver.jpg"

function useDisabledSignUp() {
  return { isLoaded: false, signUp: undefined, setActive: undefined }
}

/**
 * Same "pick the hook once at module load" pattern as driver-session.ts —
 * useSignUp() must never run unless ClerkProvider is mounted.
 */
const useSignUpIfEnabled = isAuthEnabled() ? useSignUp : useDisabledSignUp

function clerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    return (err as { errors: Array<{ message?: string }> }).errors[0]?.message ?? fallback
  }
  return fallback
}

export function DriverSignUp() {
  const { isLoaded, signUp, setActive } = useSignUpIfEnabled()
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
    if (!isLoaded || !signUp || !email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await signUp.create({ emailAddress: email.trim() })
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setCode("")
      setStep("code")
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not send verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode() {
    if (!isLoaded || !signUp || code.trim().length < CODE_LENGTH) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() })
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId })
        router.push("/")
        return
      }
      setError("Sign-up could not be completed. Try again.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Invalid verification code."))
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignUp() {
    if (!isLoaded || !signUp) return
    setError(null)
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth/sso-callback",
        redirectUrlComplete: "/",
      })
    } catch (err) {
      setError(clerkErrorMessage(err, "Google sign-up failed."))
    }
  }

  return (
    <AuthSplitShell
      photoSrc={HERO_PHOTO_SRC}
      photoAlt="A driver on a Nairobi road at dusk"
      statement="Get paid for the miles you already drive."
      statementDetail="See screen-on hours and payouts land — one place to track what your route earns."
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
            Verify and create account
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
            <h1 className="font-heading text-xl font-medium">Create your driver account</h1>
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
            onClick={() => void handleGoogleSignUp()}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>
          <AuthLegalLine
            termsHref={`${webPublicUrl()}/terms`}
            privacyHref={`${webPublicUrl()}/privacy`}
          />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Not a driver?{" "}
            <a
              href={`${appPublicUrl()}/auth/signup`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign up as an advertiser
            </a>
          </p>
        </div>
      )}
    </AuthSplitShell>
  )
}
