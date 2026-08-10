import { useSignUp, useSSO } from "@clerk/clerk-expo"
import { useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"

import { radius, spacing, typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

const CODE_LENGTH = 6

function clerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    return (
      (err as { errors: Array<{ message?: string }> }).errors[0]?.message ?? fallback
    )
  }
  return fallback
}

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const { startSSOFlow } = useSSO()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: c.bg },
    title: { ...typography.title, color: c.text },
    subtitle: { ...typography.body, color: c.mutedForeground },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: c.text,
      backgroundColor: c.surface,
    },
    error: { ...typography.bodySm, color: c.danger },
    primaryButton: {
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonLabel: { ...typography.headline, color: c.primaryForeground },
    secondaryButton: { paddingVertical: 10, alignItems: "center" },
    secondaryButtonLabel: { ...typography.bodySm, color: c.mutedForeground },
  }))

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
    setError(null)
    try {
      const { createdSessionId, setActive: setActiveFromSSO } = await startSSOFlow({
        strategy: "oauth_google",
      })
      if (createdSessionId && setActiveFromSSO) {
        await setActiveFromSSO({ session: createdSessionId })
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Google sign-up failed."))
    }
  }

  if (step === "code") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>Enter the {CODE_LENGTH}-digit code sent to {email.trim()}</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          editable={!submitting}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={styles.primaryButton}
          disabled={submitting || code.trim().length < CODE_LENGTH}
          onPress={() => void handleVerifyCode()}
        >
          <Text style={styles.primaryButtonLabel}>
            {submitting ? "Verifying…" : "Verify and create account"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          disabled={submitting}
          onPress={() => {
            setStep("email")
            setCode("")
            setError(null)
          }}
        >
          <Text style={styles.secondaryButtonLabel}>Use a different email</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your Admobi account</Text>
      <Text style={styles.subtitle}>We&apos;ll email you a one-time code.</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!submitting}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={styles.primaryButton}
        disabled={submitting || !isLoaded || !email.trim()}
        onPress={() => void handleSendCode()}
      >
        <Text style={styles.primaryButtonLabel}>{submitting ? "Sending…" : "Send code"}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => void handleGoogleSignUp()}>
        <Text style={styles.secondaryButtonLabel}>Continue with Google</Text>
      </Pressable>
    </View>
  )
}
