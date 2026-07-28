import { useMemo, useState } from "react"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { Plus, type AppIcon } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

// Hoisted so it's a stable reference across renders — a fresh FadeOut instance
// on every render can make Reanimated restart the exit animation mid-flight
// if the parent re-renders (e.g. dashboard data refetch) while it's closing.
const ITEM_EXITING = FadeOut.duration(120)

export type FabMenuItem = {
  key: string
  label: string
  icon: AppIcon
  href: string
}

type FabMenuProps = {
  items: FabMenuItem[]
}

export function FabMenu({ items }: FabMenuProps) {
  const router = useRouter()
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)
  const progress = useSharedValue(0)

  const styles = useThemedStyles((c) => ({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    wrap: {
      position: "absolute" as const,
      right: spacing.lg,
      bottom: spacing.lg,
      alignItems: "flex-end" as const,
      gap: spacing.md,
    },
    itemRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    itemLabel: {
      ...typography.label,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.md,
      overflow: "hidden" as const,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      // Android elevation shadows are drawn on a separate compositing layer
      // that doesn't fade with this row's Reanimated opacity — that left a
      // ghost shadow "trail" behind on open/close, most visible in light
      // mode. iOS's shadow* props fade correctly, so keep those.
      elevation: Platform.OS === "android" ? 0 : 2,
    },
    itemIconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: Platform.OS === "android" ? 0 : 3,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: "#000",
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    pressed: {
      opacity: 0.85,
    },
  }))

  // Indexed per item so identity stays stable across renders (see ITEM_EXITING).
  const itemEntering = useMemo(
    () => items.map((_, index) => FadeIn.delay(index * 25).duration(160)),
    [items],
  )

  const iconRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }))

  function toggle() {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    const next = !open
    setOpen(next)
    progress.value = withTiming(next ? 1 : 0, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    })
  }

  function handleSelect(href: string) {
    setOpen(false)
    // No animated close here — we're navigating away, so the menu won't be
    // visible again until it's freshly mounted closed. Animating would just
    // delay the tap-to-navigate feel for no visible benefit.
    progress.value = 0
    router.push(href as never)
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {open ? (
        <Pressable
          style={styles.backdrop}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Close quick actions"
        />
      ) : null}

      <View style={styles.wrap} pointerEvents="box-none">
        {open
          ? items.map((item, index) => (
              <Animated.View
                key={item.key}
                entering={itemEntering[index]}
                exiting={ITEM_EXITING}
                style={styles.itemRow}
              >
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Pressable
                  onPress={() => handleSelect(item.href)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={({ pressed }) => [styles.itemIconWrap, pressed && styles.pressed]}
                >
                  <item.icon color={colors.primary} size={20} />
                </Pressable>
              </Animated.View>
            ))
          : null}

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={open ? "Close quick actions" : "Open quick actions"}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Animated.View style={iconRotation}>
            <Plus color={colors.primaryForeground} size={26} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  )
}
