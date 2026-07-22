import { useCallback, useEffect, useRef, useState } from "react"
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSignIn } from "@clerk/clerk-expo"
import { Mail, ShieldCheck } from "@/components/icons"
import { isAdmobiEmail } from "@workspace/ops-contracts"

import { OtpCodeInput } from "@/components/otp-code-input"
import {
  Card,
  ErrorText,
  Field,
  IconBox,
  Label,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from "@/components/ui"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SEC = 30

type Step = "welcome" | "email" | "code"

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
  welcomeRoot: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  welcomeHero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  welcomeMark: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  welcomeCtaPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  formCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
})

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    welcomeBrand: {
      ...typography.largeTitle,
      color: c.text,
    },
    welcomeLine: {
      ...typography.body,
      color: c.mutedForeground,
      maxWidth: 320,
    },
    welcomeCta: {
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingVertical: 16,
      paddingHorizontal: spacing.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: spacing.sm,
    },
    welcomeCtaLabel: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "600" as const,
    },
    welcomeFooter: {
      ...typography.caption,
      color: c.mutedForeground,
      textAlign: "center" as const,
      marginTop: spacing.md,
    },
    emailHighlight: {
      color: c.text,
      fontWeight: "600" as const,
    },
    footerNote: {
      ...typography.caption,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
  }))
  const [step, setStep] = useState<Step>("welcome")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const verifyingRef = useRef(false)
  const welcomePress = useSharedValue(1)

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

  const welcomeCtaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: welcomePress.value }],
  }))

  async function prepareEmailCode(addressId: string) {
    if (!signIn) return
    await signIn.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: addressId,
    })
    startResendCooldown()
  }

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

      setEmailAddressId(emailCodeFactor.emailAddressId)
      await prepareEmailCode(emailCodeFactor.emailAddressId)
      setCode("")
      setStep("code")
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Could not send verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendCode() {
    if (!isLoaded || !signIn || !emailAddressId || resendIn > 0 || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await prepareEmailCode(emailAddressId)
      setCode("")
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Could not resend verification code."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(nextCode = code) {
    if (!isLoaded || !signIn || nextCode.trim().length < CODE_LENGTH) return
    if (verifyingRef.current) return

    verifyingRef.current = true
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
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Invalid verification code."))
      setCode("")
    } finally {
      verifyingRef.current = false
      setSubmitting(false)
    }
  }

  if (step === "welcome") {
    return (
      <Screen>
        <Animated.View
          entering={FadeIn.duration(420)}
          style={layoutStyles.welcomeRoot}
        >
          <View style={layoutStyles.welcomeHero}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={layoutStyles.welcomeMark}
              resizeMode="contain"
              accessibilityLabel="Admobi"
            />
            <Text style={styles.welcomeBrand}>Admobi Ops</Text>
            <Text style={styles.welcomeLine}>
              Staff console for campaigns, fleets, and field ops.
            </Text>
          </View>

          <Animated.View style={welcomeCtaStyle}>
            <Pressable
              onPressIn={() => {
                welcomePress.value = withTiming(0.97, {
                  duration: 100,
                  easing: Easing.out(Easing.quad),
                })
              }}
              onPressOut={() => {
                welcomePress.value = withTiming(1, {
                  duration: 140,
                  easing: Easing.out(Easing.quad),
                })
              }}
              onPress={() => {
                setError(null)
                setStep("email")
              }}
              style={({ pressed }) => [
                styles.welcomeCta,
                pressed && layoutStyles.welcomeCtaPressed,
              ]}
            >
              <Mail color={colors.primaryForeground} size={18} strokeWidth={2.25} />
              <Text style={styles.welcomeCtaLabel}>Continue with work email</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.welcomeFooter}>@admobihq.com only</Text>
        </Animated.View>
      </Screen>
    )
  }

  if (step === "code") {
    return (
      <Screen>
        <Animated.View entering={FadeInDown.duration(320).springify().damping(18)}>
          <View style={layoutStyles.iconWrap}>
            <IconBox icon={Mail} size={22} />
          </View>
          <Title>Check your email</Title>
          <Subtitle>
            Enter the 6-digit code sent to{" "}
            <Text style={styles.emailHighlight}>{email.trim()}</Text>
          </Subtitle>
          <Card style={layoutStyles.formCard}>
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
            <PrimaryButton
              label={submitting ? "Verifying…" : "Verify and sign in"}
              onPress={() => void handleVerifyCode()}
              disabled={submitting || code.trim().length < CODE_LENGTH}
            />
            <SecondaryButton
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
            <SecondaryButton
              label="Use a different email"
              disabled={submitting}
              onPress={() => {
                setStep("email")
                setCode("")
                setError(null)
                setEmailAddressId(null)
              }}
            />
          </Card>
        </Animated.View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(320).springify().damping(18)}>
        <View style={layoutStyles.iconWrap}>
          <IconBox icon={ShieldCheck} size={22} />
        </View>
        <Title>Work email</Title>
        <Subtitle>
          We will send a one-time verification code to your @admobihq.com
          address.
        </Subtitle>
        <Card style={layoutStyles.formCard}>
          <Label>Email</Label>
          <Field
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
          <PrimaryButton
            label={submitting ? "Sending…" : "Send code"}
            onPress={() => void handleSendCode()}
            disabled={submitting || !emailAllowed || !isLoaded}
            icon={Mail}
          />
          <SecondaryButton
            label="Back"
            disabled={submitting}
            onPress={() => {
              setStep("welcome")
              setError(null)
            }}
          />
        </Card>
        <Text style={styles.footerNote}>
          Staff access only. Customer accounts use a separate experience.
        </Text>
      </Animated.View>
    </Screen>
  )
}
