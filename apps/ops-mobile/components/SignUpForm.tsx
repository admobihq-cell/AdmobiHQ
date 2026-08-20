import { useCallback, useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useRouter } from "expo-router"
import { useSignUp } from "@clerk/clerk-expo"
import { isAdmobiEmail } from "@workspace/ops-contracts"

import { ShieldCheck } from "@/components/icons"
import {
  AuthIllustration,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthTextField,
} from "@/components/auth/AuthFormKit"
import { OtpCodeInput } from "@/components/otp-code-input"
import {
  ErrorText,
  IconBox,
  Label,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SEC = 30

type Step = "email" | "code"

function clerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    return (
      (err as { errors: Array<{ message?: string }> }).errors[0]?.message ??
      fallback
    )
  }
  return fallback
}

const layoutStyles = StyleSheet.create({
  iconWrap: {
    marginBottom: spacing.md,
  },
  formCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
})

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const styles = useThemedStyles((c) => ({
    emailHighlight: {
      color: c.text,
      fontWeight: "600" as const,
    },
    footerNote: {
      ...typography.caption,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
    link: {
      ...typography.bodySm,
      color: c.primary,
      fontWeight: "600" as const,
      textAlign: "center" as const,
      marginTop: spacing.md,
    },
  }))

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const verifyingRef = useRef(false)

  const emailAllowed = isAdmobiEmail(email)
  const domainBlocked = !!email && !emailAllowed && email.includes("@")

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const startResendCooldown = useCallback(() => {
    setResendIn(RESEND_COOLDOWN_SEC)
  }, [])

  async function prepareEmailCode() {
    if (!signUp) return
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
    startResendCooldown()
  }

  async function handleSendCode() {
    if (!isLoaded || !signUp || !emailAllowed) return

    setSubmitting(true)
    setError(null)

    try {
      await signUp.create({ emailAddress: email.trim() })
      await prepareEmailCode()
      setCode("")
      setStep("code")
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Could not send verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendCode() {
    if (!isLoaded || !signUp || resendIn > 0 || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      await prepareEmailCode()
      setCode("")
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Could not resend verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(nextCode = code) {
    if (!isLoaded || !signUp || nextCode.trim().length < CODE_LENGTH) return
    if (verifyingRef.current) return

    verifyingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: nextCode.trim(),
      })

      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId })
        return
      }

      setError("Sign-up could not be completed. Try again.")
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Invalid verification code."))
      setCode("")
    } finally {
      verifyingRef.current = false
      setSubmitting(false)
    }
  }

  if (step === "code") {
    return (
      <Screen>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={layoutStyles.scrollContent} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInDown.duration(320).springify().damping(18)}>
              <View style={layoutStyles.iconWrap}>
                <AuthIllustration source={require("@/assets/images/otp-illustration.png")} />
              </View>
              <Title>Check your email</Title>
              <Subtitle>
                Enter the 6-digit code sent to{" "}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>
              </Subtitle>
              <View style={layoutStyles.formCard}>
                <Label>Verification code</Label>
                <OtpCodeInput
                  value={code}
                  onChange={setCode}
                  length={CODE_LENGTH}
                  disabled={submitting}
                  onComplete={(value) => {
                    void handleVerifyCode(value)
                  }}
                />
                <ErrorText>{error}</ErrorText>
                <AuthPrimaryButton
                  label={submitting ? "Verifying…" : "Verify and create account"}
                  onPress={() => void handleVerifyCode()}
                  disabled={submitting || code.trim().length < CODE_LENGTH}
                />
                <AuthSecondaryButton
                  label={
                    resendIn > 0
                      ? `Resend code in ${resendIn}s`
                      : submitting
                        ? "Sending…"
                        : "Resend code"
                  }
                  disabled={submitting || resendIn > 0}
                  onPress={() => void handleResendCode()}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    )
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={layoutStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(320).springify().damping(18)}>
            <View style={layoutStyles.iconWrap}>
              <IconBox icon={ShieldCheck} size={22} />
            </View>
            <Title>Create your account</Title>
            <Subtitle>
              We will send a one-time verification code to your @admobihq.com
              address.
            </Subtitle>
            <View style={layoutStyles.formCard}>
              <Label>Email</Label>
              <AuthTextField
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                placeholder="you@admobihq.com"
              />
              {domainBlocked ? (
                <ErrorText>Only @admobihq.com addresses are authorized.</ErrorText>
              ) : (
                <ErrorText>{error}</ErrorText>
              )}
              <AuthPrimaryButton
                label={submitting ? "Sending…" : "Send code"}
                onPress={() => void handleSendCode()}
                disabled={submitting || !emailAllowed || !isLoaded}
              />
              <AuthSecondaryButton
                label="Back"
                disabled={submitting}
                onPress={() => router.replace("/sign-in")}
              />
            </View>
            <Text style={styles.footerNote}>
              Staff access only. Customer accounts use a separate experience.
            </Text>
            <Text style={styles.link} onPress={() => router.replace("/sign-in")}>
              Already have an account? Sign in
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
