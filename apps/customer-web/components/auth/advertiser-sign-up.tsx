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
import { webPublicUrl } from "@/lib/site-urls"

import { AuthDisabledMessage } from "@/components/auth/auth-disabled-message"

const CODE_LENGTH = 6
const HERO_PHOTO_SRC = "/auth/hero-advertiser.jpg"

/**
 * Optional here on purpose. Google's own consent screen has no place to ask for
 * a company, so gating "Continue with Google" on this field only produced a
 * dead button with no explanation. <CompanyNamePrompt> collects it on first
 * load of the dashboard instead, for whichever path skipped it.
 */
function companyMetadata(company: string): { unsafeMetadata?: { companyName: string } } {
  const value = company.trim()
  return value ? { unsafeMetadata: { companyName: value } } : {}
}

function useDisabledSignUp(): { signUp: null } {
  return { signUp: null }
}

/**
 * Same "pick the hook once at module load" pattern as customer-session.ts —
 * useSignUp() must never run unless ClerkProvider is mounted.
 */
const useSignUpIfEnabled = isAuthEnabled() ? useSignUp : useDisabledSignUp

export function AdvertiserSignUp() {
  const { signUp } = useSignUpIfEnabled()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthEnabled()) {
    return <AuthDisabledMessage />
  }

  async function handleSendCode() {
    if (!signUp || !email.trim()) return
    setSubmitting(true)
    setError(null)

    // unsafeMetadata is the only field a client may set during sign-up; Clerk
    // copies it onto the created user, which is what the ops Users list reads.
    const { error: createError } = await signUp.create({
      emailAddress: email.trim(),
      ...companyMetadata(company),
    })
    if (createError) {
      setError(createError.longMessage ?? createError.message ?? "Could not send verification code.")
      setSubmitting(false)
      return
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode()
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
    if (!signUp || code.trim().length < CODE_LENGTH) return
    setSubmitting(true)
    setError(null)

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() })
    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message ?? "Invalid verification code.")
      setCode("")
      setSubmitting(false)
      return
    }

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: () => {
          router.push("/")
        },
      })
      return
    }

    // Not "complete" here means the Clerk instance requires fields this form
    // never sends — username and password are the usual culprits, and neither
    // an email code nor Google can ever supply them. Log what is missing;
    // without this the failure is undiagnosable from the browser.
    console.error("Clerk sign-up incomplete", {
      status: signUp.status,
      missingFields: signUp.missingFields,
      unverifiedFields: signUp.unverifiedFields,
    })
    setError("Sign-up could not be completed. Try again.")
    setSubmitting(false)
  }

  async function handleGoogleSignUp() {
    if (!signUp) return
    setSubmitting(true)
    setError(null)

    const { error: ssoError } = await signUp.sso({
      strategy: "oauth_google",
      redirectCallbackUrl: "/auth/sso-callback/advertiser",
      redirectUrl: "/",
      ...companyMetadata(company),
    })
    // Success navigates away to Google, so only the failure path gets here.
    if (ssoError) {
      setError(ssoError.longMessage ?? ssoError.message ?? "Google sign-up failed.")
      setSubmitting(false)
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
            <h1 className="font-heading text-xl font-medium">Create your Admobi account</h1>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company">Company or organization</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Media"
              autoComplete="organization"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Optional — we&apos;ll ask for it after you sign in if you skip it.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {/* Clerk mounts its bot-protection widget here. Without this element it falls
              back to an invisible CAPTCHA in a display:none div, which Turnstile then
              fails (600010) — blocking both the email code and Google sign-up. */}
          <div id="clerk-captcha" />
          <Button
            className="w-full"
            size="lg"
            disabled={submitting || !signUp || !email.trim()}
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
            disabled={submitting || !signUp}
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
              href="/auth/login/advertiser"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthSplitShell>
  )
}
