import { useAuth, useUser } from "@clerk/clerk-expo"
import { useRouter } from "expo-router"
import {
  BarChart3,
  Car,
  FileText,
  LayoutDashboard,
  Mail,
  Megaphone,
  Truck,
} from "@/components/icons"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  Card,
  Eyebrow,
  ModuleCard,
  SecondaryButton,
} from "@/components/ui"
import { getPrimaryEmail } from "@/lib/auth"
import { colors, spacing, typography } from "@/lib/theme"

const MODULES = [
  {
    href: "/(ops)/leads" as const,
    title: "Campaign leads",
    description: "Review and manage inbound campaign interest.",
    icon: Megaphone,
  },
  {
    href: "/(ops)/fleet" as const,
    title: "Fleet partners",
    description: "Onboard and track fleet partner applications.",
    icon: Truck,
  },
  {
    href: "/(ops)/drivers" as const,
    title: "Drivers",
    description: "Monitor driver signups and city distribution.",
    icon: Car,
  },
  {
    href: "/(ops)/waitlist" as const,
    title: "Waitlist",
    description: "See who is waiting to launch with Admobi.",
    icon: Mail,
  },
  {
    href: "/(ops)/media-kit" as const,
    title: "Media kit",
    description: "Handle media kit download requests.",
    icon: FileText,
  },
] as const

export default function OpsHomeScreen() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId,
  )
  const rawName =
    user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg },
      ]}
    >
      <Card style={styles.hero}>
        <View style={styles.heroAccent} />
        <Eyebrow>Admobi Ops</Eyebrow>
        <Text style={styles.heroTitle}>Welcome back, {displayName}</Text>
        <Text style={styles.heroBody}>
          You are signed in as{" "}
          <Text style={styles.heroEmail}>{email}</Text>. Review operational
          data, manage submissions, and monitor activity from your phone.
        </Text>
        <View style={styles.heroActions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/(ops)/overview")}
          >
            <BarChart3
              color={colors.primaryForeground}
              size={16}
              strokeWidth={2.25}
            />
            <Text style={styles.primaryActionText}>View analytics</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/(ops)/leads")}
          >
            <LayoutDashboard
              color={colors.text}
              size={16}
              strokeWidth={2.25}
            />
            <Text style={styles.secondaryActionText}>Open leads</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where to next</Text>
        <Text style={styles.sectionDescription}>
          Jump straight into the area you need.
        </Text>
      </View>

      <View style={styles.grid}>
        {MODULES.map((module) => (
          <ModuleCard
            key={module.href}
            icon={module.icon}
            title={module.title}
            description={module.description}
            onPress={() => router.push(module.href)}
          />
        ))}
      </View>

      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    overflow: "hidden",
    position: "relative",
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(155, 69, 37, 0.05)",
  },
  heroTitle: {
    ...typography.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroBody: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  heroEmail: {
    color: colors.text,
    fontWeight: "600",
  },
  heroActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryAction: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.88,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
  },
  sectionDescription: {
    ...typography.bodySm,
    color: colors.mutedForeground,
  },
  grid: {
    gap: spacing.md,
  },
})
