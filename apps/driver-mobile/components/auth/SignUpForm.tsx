import { useSignUp, useSSO } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  AuthCard,
  AuthErrorText,
  AuthIconBadge,
  AuthLabel,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthTextField,
} from "@/components/auth/AuthFormKit"
import { AuthLegalLine } from "@/components/auth/AuthLegalLine"
import { AuthLogo } from "@/components/auth/AuthLogo"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { OtpCodeInput } from "@/components/auth/OtpCodeInput"
import { Mail, Shield } from "@/components/icons"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { spacing, typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

const CODE_LENGTH = 6

function useDisabledSignUp() {
  return { isLoaded: false, signUp: undefined, setActive: undefined }
}

function useDisabledSSO() {
  return { startSSOFlow: async () => ({ createdSessionId: undefined, setActive: undefined }) }
}

/**
 * Same "pick the hook once at module load" pattern used elsewhere in this
 * app — useSignUp()/useSSO() must never run unless ClerkProvider is mounted.
 */
const useSignUpIfEnabled = isAuthEnabled() ? useSignUp : useDisabledSignUp
const useSSOIfEnabled = isAuthEnabled() ? useSSO : useDisabledSSO

function clerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    return (
      (err as { errors: Array<{ message?: string }> }).errors[0]?.message ?? fallback
    )
  }
  return fallback
}

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUpIfEnabled()
  const { startSSOFlow } = useSSOIfEnabled()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    scrollContent: { flexGrow: 1, justifyContent: "center" },
    formArea: { gap: spacing.lg, padding: spacing.xl },
    title: { ...typography.title, color: c.text },
    subtitle: { ...typography.body, color: c.mutedForeground },
    highlight: { color: c.text, fontWeight: "600" },
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

  async function handleVerifyCode(nextCode = code) {
    if (!isLoaded || !signUp || nextCode.trim().length < CODE_LENGTH) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: nextCode.trim() })
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
    setGoogleSubmitting(true)
    try {
      const { createdSessionId, setActive: setActiveFromSSO } = await startSSOFlow({
        strategy: "oauth_google",
      })
      if (createdSessionId && setActiveFromSSO) {
        await setActiveFromSSO({ session: createdSessionId })
        return
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Google sign-up failed."))
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formArea}>
            <AuthLogo />
            {step === "code" ? (
              <Animated.View entering={FadeInDown.duration(280).springify().damping(18)} style={{ gap: spacing.lg }}>
                <AuthIconBadge icon={Shield} />
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.title}>Check your email</Text>
                  <Text style={styles.subtitle}>
                    Enter the {CODE_LENGTH}-digit code sent to{" "}
                    <Text style={styles.highlight}>{email.trim()}</Text>
                  </Text>
                </View>
                <AuthCard>
                  <AuthLabel>Verification code</AuthLabel>
                  <OtpCodeInput
                    value={code}
                    onChange={setCode}
                    length={CODE_LENGTH}
                    disabled={submitting}
                    onComplete={(value) => void handleVerifyCode(value)}
                  />
                  <AuthErrorText>{error}</AuthErrorText>
                  <AuthPrimaryButton
                    label={submitting ? "Verifying…" : "Verify and create account"}
                    disabled={submitting || code.trim().length < CODE_LENGTH}
                    onPress={() => void handleVerifyCode()}
                  />
                  <AuthSecondaryButton
                    label="Use a different email"
                    disabled={submitting}
                    onPress={() => {
                      setStep("email")
                      setCode("")
                      setError(null)
                    }}
                  />
                </AuthCard>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(280).springify().damping(18)} style={{ gap: spacing.lg }}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.title}>Create your Admobi Driver account</Text>
                  <Text style={styles.subtitle}>We&apos;ll email you a one-time code.</Text>
                </View>
                <AuthCard>
                  <View>
                    <AuthLabel>Email address</AuthLabel>
                    <View style={{ height: spacing.xs }} />
                    <AuthTextField
                      icon={Mail}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!submitting}
                      autoFocus
                      returnKeyType="go"
                      onSubmitEditing={() => void handleSendCode()}
                    />
                  </View>
                  <AuthErrorText>{error}</AuthErrorText>
                  <AuthPrimaryButton
                    label={submitting ? "Sending…" : "Send code"}
                    disabled={submitting || !isLoaded || !email.trim()}
                    onPress={() => void handleSendCode()}
                  />

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <GoogleButton
                    label={googleSubmitting ? "Opening Google…" : "Continue with Google"}
                    disabled={googleSubmitting}
                    onPress={() => void handleGoogleSignUp()}
                  />
                </AuthCard>

                <View style={{ gap: spacing.md }}>
                  <AuthLegalLine />
                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <Link href="/sign-in">
                      <Text style={styles.footerLink}>Sign in</Text>
                    </Link>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
