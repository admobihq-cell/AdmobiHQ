"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"

import { AdmobiEmailField } from "@/components/admobi-email-field"
import { isAdmobiEmail } from "@/lib/allowed-email"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function AdmobiOtpSignInForm() {
  const { signIn } = useSignIn()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailAllowed = isAdmobiEmail(email)
  const domainBlocked = !!email && !emailAllowed && email.includes("@")

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault()
    if (!signIn || !emailAllowed) {
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: createError } = await signIn.create({
      identifier: email.trim(),
    })

    if (createError) {
      if (createError.code === "form_identifier_not_found") {
        setError("No account found for this email. Create an account first.")
      } else {
        setError(createError.longMessage ?? createError.message ?? "Could not send verification code.")
      }
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

    setVerifying(true)
    setSubmitting(false)
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault()
    if (!signIn || !code.trim()) {
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: verifyError } = await signIn.emailCode.verifyCode({ code: code.trim() })
    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message ?? "Invalid verification code.")
      setSubmitting(false)
      return
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        // Hard navigation, not router.push — the App Router's client cache can
        // otherwise serve a stale pre-auth response for "/" or "/home" after
        // repeated sign-in attempts in the same tab.
        navigate: () => {
          window.location.href = "/home"
        },
      })
      return
    }

    setError("Sign-in could not be completed. Try again.")
    setSubmitting(false)
  }

  if (verifying) {
    return (
      <form
        onSubmit={handleVerifyCode}
        className="flex w-full flex-col gap-4"
      >
        <div className="space-y-1 text-center">
          <h2 className="text-base font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            Enter the verification code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sign-in-code">Verification code</Label>
          <Input
            id="sign-in-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={submitting}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={submitting || !code.trim()}>
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
        id="sign-in-email"
        value={email}
        onChange={setEmail}
        disabled={submitting}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        disabled={submitting || !emailAllowed || domainBlocked}
      >
        {submitting ? "Sending code..." : "Send verification code"}
      </Button>
    </form>
  )
}
