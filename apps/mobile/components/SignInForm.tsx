import { useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSignIn } from "@clerk/clerk-expo"
import { Mail, ShieldCheck } from "@/components/icons"
import { isAdmobiEmail } from "@workspace/ops-contracts"

import {
  Card,
  ErrorText,
  Eyebrow,
  Field,
  IconBox,
  Label,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui"
import { colors, spacing, typography } from "@/lib/theme"

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailAllowed = isAdmobiEmail(email)
  const domainBlocked = !!email && !emailAllowed && email.includes("@")

  async function handleSendCode() {
    if (!isLoaded || !signIn || !emailAllowed) return

    setSubmitting(true)
    setError(null)

    try {
      const attempt = await signIn.create({
        identifier: email.trim(),
      })

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
      setVerifying(true)
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors: Array<{ message?: string }> }).errors[0]?.message
          : null
      setError(message ?? "Could not send verification code.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode() {
    if (!isLoaded || !signIn || !code.trim()) return

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
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors: Array<{ message?: string }> }).errors[0]?.message
          : null
      setError(message ?? "Invalid verification code.")
    } finally {
      setSubmitting(false)
    }
  }

  if (verifying) {
    return (
      <Screen>
        <View style={styles.iconWrap}>
          <IconBox icon={Mail} size={22} />
        </View>
        <Title>Check your email</Title>
        <Subtitle>Enter the code sent to {email.trim()}.</Subtitle>
        <Label>Verification code</Label>
        <Field
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="123456"
        />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton
          label={submitting ? "Verifying…" : "Verify and sign in"}
          onPress={() => void handleVerifyCode()}
          disabled={submitting || code.trim().length < 4}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={styles.iconWrap}>
        <IconBox icon={ShieldCheck} size={22} />
      </View>
      <Eyebrow>Admobi</Eyebrow>
      <Title>Ops Console</Title>
      <Subtitle>
        Sign in with your @admobihq.com email. We will send a one-time code.
      </Subtitle>
      <Card style={styles.formCard}>
        <Label>Work email</Label>
        <Field
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@admobihq.com"
        />
        {domainBlocked ? (
          <ErrorText>Only @admobihq.com addresses are authorized.</ErrorText>
        ) : (
          <ErrorText>{error}</ErrorText>
        )}
        <PrimaryButton
          label={submitting ? "Sending…" : "Send code"}
          onPress={() => void handleSendCode()}
          disabled={submitting || !emailAllowed || !isLoaded}
          icon={Mail}
        />
      </Card>
      <Text style={styles.footerNote}>
        Staff access only. Customer accounts use a separate experience.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    marginBottom: spacing.md,
  },
  formCard: {
    marginBottom: spacing.md,
  },
  footerNote: {
    ...typography.caption,
    color: colors.mutedForeground,
    textAlign: "center",
  },
})
