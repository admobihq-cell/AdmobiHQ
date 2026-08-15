import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"

import { Clock, Shield } from "@/components/icons"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const COPY: Record<string, { title: string; description: string }> = {
  submitted: {
    title: "Your application is under review",
    description:
      "Thanks for submitting your profile. Our team is reviewing your documents — this usually takes a day or two. Check Settings for the latest status.",
  },
  rejected: {
    title: "Your application needs attention",
    description: "Head to Settings to see what needs fixing and resubmit.",
  },
  changes_requested: {
    title: "Changes requested on your application",
    description: "Head to Settings to see what needs fixing and resubmit.",
  },
}

const DEFAULT_COPY = {
  title: "Complete your profile to unlock this",
  description: "Verify your identity and payout details so we can activate your driver account.",
}

/** Shown in place of real tab content until the driver's profile is
 * approved — every tab except Settings uses this. Settings is where the
 * status/stepper trigger actually live. */
export function CompleteProfilePlaceholder({ status }: { status: string }) {
  const router = useRouter()
  const isReview = status === "submitted"
  const copy = COPY[status] ?? DEFAULT_COPY

  const styles = useThemedStyles((c) => ({
    center: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: spacing.xl,
    },
    icon: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: c.mutedSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: spacing.md,
    },
    title: { ...typography.headline, color: c.text, textAlign: "center" as const },
    description: {
      ...typography.body,
      color: c.mutedText,
      textAlign: "center" as const,
      marginTop: spacing.xs,
    },
    button: {
      marginTop: spacing.lg,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    buttonLabel: { ...typography.body, fontWeight: "700" as const, color: c.primaryForeground },
  }))

  return (
    <View style={styles.center}>
      <View style={styles.icon}>
        {isReview ? <Clock size={22} /> : <Shield size={22} />}
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.description}>{copy.description}</Text>
      {!isReview ? (
        <Pressable style={styles.button} onPress={() => router.push("/(tabs)/settings")}>
          <Text style={styles.buttonLabel}>Go to Settings</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
