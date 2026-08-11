import { useEffect } from "react"
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useUser } from "@clerk/clerk-expo"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
  interpolate,
} from "react-native-reanimated"
import type { OpsPermission } from "@workspace/ops-contracts"

import {
  FileText,
  LifeBuoy,
  Mail,
  Map,
  Person,
  Radio,
  Wallet,
  X,
  type AppIcon,
} from "@/components/icons"
import { getPrimaryEmail } from "@/lib/auth"
import { useOpsAccess } from "@/lib/ops-client"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.82, 340)

type DrawerLink = {
  key: string
  label: string
  description: string
  icon: AppIcon
  href: Parameters<ReturnType<typeof useRouter>["push"]>[0]
  /** Omitted for links every signed-in member can see regardless of role. */
  permission?: OpsPermission
}

const LINKS: DrawerLink[] = [
  {
    key: "support",
    label: "Support",
    description: "Cases from customers and drivers",
    icon: LifeBuoy,
    href: "/(ops)/support",
    permission: "support",
  },
  {
    key: "announcements",
    label: "Announcements",
    description: "Broadcast to customer apps",
    icon: Radio,
    href: "/(ops)/announcements",
    permission: "announcements",
  },
  {
    key: "map",
    label: "Network map",
    description: "Corridors and city view",
    icon: Map,
    href: "/(ops)/map",
  },
  {
    key: "waitlist",
    label: "Waitlist",
    description: "Pending signups",
    icon: Mail,
    href: "/(ops)/waitlist",
    permission: "waitlist",
  },
  {
    key: "media-kit",
    label: "Media kit",
    description: "Advertiser requests",
    icon: FileText,
    href: "/(ops)/media-kit",
    permission: "media_kit",
  },
  {
    key: "finances",
    label: "Finances",
    description: "Wallet, top-ups & payouts",
    icon: Wallet,
    href: "/(ops)/finances",
    permission: "finances",
  },
]

/**
 * Slide-in menu opened from the app bar's avatar button (see
 * `onAvatarPress` in (ops)/_layout.tsx). Holds destinations that don't have
 * their own tab (Support, Announcements, Map, Waitlist, Media kit,
 * Finances) plus a link into the full Profile/settings screen, which still
 * owns theme, sign-out, and dev tools and stays reachable directly from the
 * bottom tab bar too.
 */
export function NavDrawer({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { role, permissions } = useOpsAccess()
  const progress = useSharedValue(0)

  const visibleLinks = LINKS.filter(
    (link) => !link.permission || role === "admin" || permissions.includes(link.permission),
  )

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220 })
  }, [visible, progress])

  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId
  )
  const rawName = user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [DRAWER_WIDTH, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }))

  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
    },
    panel: {
      width: DRAWER_WIDTH,
      height: "100%" as const,
      backgroundColor: c.bg,
      paddingTop: insets.top + spacing.md,
      paddingBottom: insets.bottom + spacing.md,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.border,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    hero: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    heroCopy: { flex: 1, minWidth: 0 },
    heroName: { ...typography.headline, fontSize: 15, color: c.text },
    heroEmail: {
      ...typography.caption,
      color: c.mutedForeground,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xs,
    },
    group: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    rowPressed: { opacity: 0.7 },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: c.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    rowCopy: { flex: 1, minWidth: 0, gap: 1 },
    rowLabel: { ...typography.section, fontSize: 14, color: c.text },
    rowDescription: { ...typography.caption, color: c.mutedForeground },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 56,
    },
  }))

  const go = (href: DrawerLink["href"]) => {
    onClose()
    router.push(href)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.panel, panelStyle]}>
          <View style={styles.header}>
            <View style={styles.hero}>
              <View style={styles.avatar}>
                <Person color={colors.primary} size={24} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {displayName}
                </Text>
                {email ? (
                  <Text style={styles.heroEmail} numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <X color={colors.mutedForeground} size={22} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Modules</Text>
            <View style={styles.group}>
              {visibleLinks.map((link, index) => (
                <View key={link.key}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => go(link.href)}
                  >
                    <View style={styles.iconBox}>
                      <link.icon color={colors.primary} size={16} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowLabel}>{link.label}</Text>
                      <Text style={styles.rowDescription} numberOfLines={1}>
                        {link.description}
                      </Text>
                    </View>
                  </Pressable>
                  {index < visibleLinks.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.group}>
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => go("/(ops)/profile")}
              >
                <View style={styles.iconBox}>
                  <Person color={colors.primary} size={16} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>Profile & settings</Text>
                  <Text style={styles.rowDescription} numberOfLines={1}>
                    Theme, updates, sign out
                  </Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}
