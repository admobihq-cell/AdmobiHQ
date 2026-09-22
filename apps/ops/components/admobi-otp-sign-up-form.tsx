"use client"

import { useState } from "react"
import { useSignUp } from "@clerk/nextjs"

import { AdmobiEmailField } from "@/components/admobi-email-field"
import { isAdmobiEmail } from "@/lib/allowed-email"
import { Button } from "@workspace/ui/components/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp"
import { Label } from "@workspace/ui/components/label"

const CODE_LENGTH = 6

export function AdmobiOtpSignUpForm() {
  const { signUp } = useSignUp()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailAllowed = isAdmobiEmail(email)
  const domainBlocked = !!email && !emailAllowed && email.includes("@")

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault()
    if (!signUp || !emailAllowed) {
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: createError } = await signUp.create({
      emailAddress: email.trim(),
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

    setVerifying(true)
    setSubmitting(false)
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault()
    if (!signUp || code.trim().length < CODE_LENGTH) {
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() })
    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message ?? "Invalid verification code.")
      setSubmitting(false)
      return
    }

    if (signUp.status === "complete") {
      await signUp.finalize({
        // Hard navigation, not router.push — the App Router's client cache can
        // otherwise serve a stale pre-auth response for "/" or "/home" after
        // repeated sign-in attempts in the same tab.
        navigate: () => {
          window.location.href = "/home"
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

  if (verifying) {
    return (
      <form
        onSubmit={handleVerifyCode}
        className="flex w-full flex-col gap-4"
      >
        <div className="space-y-1 text-center">
          <h2 className="text-base font-semibold">Verify your email</h2>
          <p className="text-sm text-muted-foreground">
            Enter the verification code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="sign-up-code" className="self-start">
            Verification code
          </Label>
          <InputOTP
            id="sign-up-code"
            value={code}
            onChange={setCode}
            maxLength={CODE_LENGTH}
            disabled={submitting}
            autoFocus
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={submitting || code.trim().length < CODE_LENGTH}>
          {submitting ? "Verifying..." : "Verify and continue"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={() => {
            setVerifying(false)
            setCode("")
            setError(null)
          }}
        >
          Use a different email
        </Button>
      </form>
    )
  }

  return (
    <form
      onSubmit={handleSendCode}
      className="flex w-full flex-col gap-4"
    >
      <AdmobiEmailField
        id="sign-up-email"
        value={email}
        onChange={setEmail}
        disabled={submitting}
      />

      <p className="text-xs text-muted-foreground">
        Creating an account doesn&apos;t grant Ops Console access — an admin adds you to the
        team from Team → Invite.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div id="clerk-captcha" />

      <Button
        type="submit"
        disabled={submitting || !emailAllowed || domainBlocked}
      >
        {submitting ? "Sending code..." : "Send verification code"}
      </Button>
    </form>
  )
}
