"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"
import type { EmailCodeFactor, SignInFirstFactor } from "@clerk/types"

import { AdmobiEmailField } from "@/components/admobi-email-field"
import { isAdmobiEmail } from "@/lib/allowed-email"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

function isEmailCodeFactor(factor: SignInFirstFactor): factor is EmailCodeFactor {
  return factor.strategy === "email_code"
}

export function AdmobiOtpSignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn()
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
    if (!isLoaded || !signIn || !emailAllowed) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const attempt = await signIn.create({
        identifier: email.trim(),
      })

      const emailCodeFactor = attempt.supportedFirstFactors?.find(isEmailCodeFactor)
      if (!emailCodeFactor) {
        setError("Email verification is not available for this account.")
        return
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailCodeFactor.emailAddressId,
      })
      setVerifying(true)
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const clerkError = err.errors[0]
        if (clerkError?.code === "form_identifier_not_found") {
          setError("No account found for this email. Create an account first.")
        } else {
          setError(
            clerkError?.longMessage ??
              clerkError?.message ??
              "Could not send verification code.",
          )
        }
      } else {
        setError("Could not send verification code.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn || !code.trim()) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      })

      if (attempt.status === "complete") {
        await setActive({
          session: attempt.createdSessionId,
          navigate: () => router.push("/home"),
        })
        return
      }

      setError("Sign-in could not be completed. Try again.")
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
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-6"
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
