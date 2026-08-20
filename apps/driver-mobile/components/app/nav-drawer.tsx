import { useEffect } from "react"
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
  interpolate,
} from "react-native-reanimated"

import { HelpCircle, Payouts, Routes, X, type AppIcon } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.82, 340)

type DrawerLink = {
  key: string
  label: string
  description: string
  icon: AppIcon
  href: Parameters<ReturnType<typeof useRouter>["push"]>[0]
}

const LINKS: DrawerLink[] = [
  {
    key: "routes",
    label: "Routes",
    description: "Map and route history",
    icon: Routes,
    href: "/routes",
  },
  {
    key: "payouts",
    label: "Payouts",
    description: "Pending and settled payouts",
    icon: Payouts,
    href: "/payouts",
  },
  {
    key: "support",
    label: "Support",
    description: "Get help with a delivery or your account",
    icon: HelpCircle,
    href: "/support",
  },
]

/**
 * Slide-in menu opened from the app bar's menu button. Holds destinations
 * that don't have their own bottom tab (Routes, Payouts, Support) so the
 * tab bar can stay to the four most-used screens.
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
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220 })
  }, [visible, progress])

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
    headerTitle: { ...typography.headline, fontSize: 15, color: c.text },
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
            <Text style={styles.headerTitle}>Menu</Text>
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
            <Text style={styles.sectionLabel}>More</Text>
            <View style={styles.group}>
              {LINKS.map((link, index) => (
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
                  {index < LINKS.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}
