import { useSignIn, useSSO } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  AuthErrorText,
  AuthIllustration,
  AuthLabel,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthTextField,
} from "@/components/auth/AuthFormKit"
import { AuthLegalLine } from "@/components/auth/AuthLegalLine"
import { AuthLogo } from "@/components/auth/AuthLogo"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { OtpCodeInput } from "@/components/auth/OtpCodeInput"
import { Mail } from "@/components/icons"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { useWarmUpBrowser } from "@/lib/auth/use-warm-up-browser"
import { spacing, typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

const CODE_LENGTH = 6

function useDisabledSignIn() {
  return { isLoaded: false, signIn: undefined, setActive: undefined }
}

function useDisabledSSO() {
  return { startSSOFlow: async () => ({ createdSessionId: undefined, setActive: undefined }) }
}

/**
 * Same "pick the hook once at module load" pattern used elsewhere in this
 * app — useSignIn()/useSSO() must never run unless ClerkProvider is mounted.
 */
const useSignInIfEnabled = isAuthEnabled() ? useSignIn : useDisabledSignIn
const useSSOIfEnabled = isAuthEnabled() ? useSSO : useDisabledSSO

function clerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    return (
      (err as { errors: Array<{ message?: string }> }).errors[0]?.message ?? fallback
    )
  }
  return fallback
}

export function SignInForm() {
  useWarmUpBrowser()
  const { isLoaded, signIn, setActive } = useSignInIfEnabled()
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
    formArea: { gap: spacing.xl, padding: spacing.xl },
    title: { ...typography.largeTitle, color: c.text, textAlign: "center" },
    subtitle: { ...typography.body, color: c.mutedForeground, textAlign: "center" },
    highlight: { color: c.text, fontWeight: "600" },
    dividerLabel: { ...typography.caption, color: c.mutedForeground, textAlign: "center" },
    footerRow: { flexDirection: "row", justifyContent: "center", gap: spacing.xs },
    footerText: { ...typography.bodySm, color: c.mutedForeground },
    footerLink: { ...typography.bodySm, color: c.text, fontWeight: "600" },
  }))

  async function handleSendCode() {
    if (!isLoaded || !signIn || !email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signIn.create({ identifier: email.trim() })
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
      setCode("")
      setStep("code")
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not send verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(nextCode = code) {
    if (!isLoaded || !signIn || nextCode.trim().length < CODE_LENGTH) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: nextCode.trim(),
      })
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId })
        return
      }
      setError("Sign-in could not be completed. Try again.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Invalid verification code."))
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
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
      // Google completed but Clerk didn't return a session — e.g. this
      // Google account needs to finish signing up first. Without this the
      // screen just silently dropped the user back where they started.
      setError("That Google account isn't linked to an account yet. Try signing up instead.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Google sign-in failed."))
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
              <Animated.View entering={FadeInDown.duration(240)} style={{ gap: spacing.xl }}>
                <AuthIllustration source={require("@/assets/images/otp-illustration.png")} />
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.title}>Check your email</Text>
                  <Text style={styles.subtitle}>
                    Enter the {CODE_LENGTH}-digit code sent to{" "}
                    <Text style={styles.highlight}>{email.trim()}</Text>
                  </Text>
                </View>
                <View style={{ gap: spacing.lg }}>
                  <View style={{ gap: spacing.sm }}>
                    <AuthLabel>Verification code</AuthLabel>
                    <OtpCodeInput
                      value={code}
                      onChange={setCode}
                      length={CODE_LENGTH}
                      disabled={submitting}
                      onComplete={(value) => void handleVerifyCode(value)}
                    />
                  </View>
                  <AuthErrorText>{error}</AuthErrorText>
                  <AuthPrimaryButton
                    label={submitting ? "Verifying…" : "Verify and sign in"}
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
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(240)} style={{ gap: spacing.xl }}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.title}>Sign in to Admobi</Text>
                  <Text style={styles.subtitle}>We&apos;ll email you a one-time code.</Text>
                </View>
                <View style={{ gap: spacing.lg }}>
                  <View style={{ gap: spacing.sm }}>
                    <AuthLabel>Email address</AuthLabel>
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

                  <Text style={styles.dividerLabel}>or</Text>

                  <GoogleButton
                    label={googleSubmitting ? "Opening Google…" : "Continue with Google"}
                    disabled={googleSubmitting}
                    onPress={() => void handleGoogleSignIn()}
                  />
                </View>

                <View style={{ gap: spacing.md }}>
                  <AuthLegalLine />
                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Don&apos;t have an account?</Text>
                    <Link href="/sign-up">
                      <Text style={styles.footerLink}>Sign up</Text>
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
