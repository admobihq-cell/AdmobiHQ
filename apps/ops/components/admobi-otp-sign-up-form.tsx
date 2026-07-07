"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSignUp } from "@clerk/nextjs"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"

import { AdmobiEmailField } from "@/components/admobi-email-field"
import { isAdmobiEmail } from "@/lib/allowed-email"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function AdmobiOtpSignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailAllowed = isAdmobiEmail(email)
  const domainBlocked = !!email && !emailAllowed && email.includes("@")

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signUp || !emailAllowed) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await signUp.create({
        emailAddress: email.trim(),
      })
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      })
      setVerifying(true)
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const clerkError = err.errors[0]
        setError(
          clerkError?.longMessage ??
            clerkError?.message ??
            "Could not send verification code.",
        )
      } else {
        setError("Could not send verification code.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signUp || !code.trim()) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      })

      if (attempt.status === "complete") {
        await setActive({
          session: attempt.createdSessionId,
          navigate: () => router.push("/home"),
        })
        return
      }

      setError("Sign-up could not be completed. Try again.")
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const clerkError = err.errors[0]
        setError(
          clerkError?.longMessage ??
            clerkError?.message ??
            "Invalid verification code.",
        )
      } else {
        setError("Invalid verification code.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (verifying) {
    return (
      <form
        onSubmit={handleVerifyCode}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-6"
      >
        <div className="space-y-1 text-center">
          <h2 className="text-base font-semibold">Verify your email</h2>
          <p className="text-sm text-muted-foreground">
            Enter the verification code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sign-up-code">Verification code</Label>
          <Input
            id="sign-up-code"
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
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-6"
    >
      <AdmobiEmailField
        id="sign-up-email"
        value={email}
        onChange={setEmail}
        disabled={submitting}
      />

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
