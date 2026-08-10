import { useSignUp, useSSO } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native"

import { AuthHeroBand } from "@/components/auth/AuthHeroBand"
import { AuthLegalLine } from "@/components/auth/AuthLegalLine"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { radius, spacing, typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

const CODE_LENGTH = 6
const HERO_IMAGE = require("@/assets/images/driver-aerial-routes.jpg")

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
    root: { flex: 1, backgroundColor: c.bg },
    scrollContent: { flexGrow: 1 },
    formArea: { flex: 1, gap: spacing.md, padding: spacing.xl },
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
    dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
    dividerLabel: { ...typography.caption, color: c.mutedForeground },
    footerRow: { flexDirection: "row", justifyContent: "center", gap: spacing.xs },
    footerText: { ...typography.bodySm, color: c.mutedForeground },
    footerLink: { ...typography.bodySm, color: c.text, fontWeight: "600" },
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

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <AuthHeroBand image={HERO_IMAGE} eyebrow="Admobi Driver" title="Get started" />

          <View style={styles.formArea}>
            {step === "code" ? (
              <>
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.title}>Check your email</Text>
                  <Text style={styles.subtitle}>
                    Enter the {CODE_LENGTH}-digit code sent to {email.trim()}
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  editable={!submitting}
                  autoFocus
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
              </>
            ) : (
              <>
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.title}>Create your Admobi Driver account</Text>
                  <Text style={styles.subtitle}>We&apos;ll email you a one-time code.</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!submitting}
                  autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  style={styles.primaryButton}
                  disabled={submitting || !isLoaded || !email.trim()}
                  onPress={() => void handleSendCode()}
                >
                  <Text style={styles.primaryButtonLabel}>{submitting ? "Sending…" : "Send code"}</Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <GoogleButton label="Continue with Google" onPress={() => void handleGoogleSignUp()} />

                <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
                  <AuthLegalLine />
                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <Link href="/sign-in">
                      <Text style={styles.footerLink}>Sign in</Text>
                    </Link>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
