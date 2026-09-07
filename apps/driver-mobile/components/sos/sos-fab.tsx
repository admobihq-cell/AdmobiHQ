import { Pressable, Text, View } from "react-native"
import { useRouter, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Siren } from "@/components/icons"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

/**
 * Routes where the FAB would be wrong or unreachable: the driver is not signed
 * in yet, is mid-onboarding, or is already in the SOS flow.
 */
const HIDDEN_PREFIXES = ["/sos", "/sign-in", "/sign-up", "/profile-setup"]

/** Roughly the tab bar's height — the FAB clears it so it never covers a tab. */
const TAB_BAR_ALLOWANCE = 64

/**
 * Global SOS button, mounted once in app/_layout.tsx so every screen has it and
 * no future screen can forget it.
 *
 * Deliberately NOT behind a platform flag: the route to reporting an accident
 * must not depend on a toggle someone can forget to turn on, or that gets
 * switched off during an unrelated incident.
 *
 * It ONLY NAVIGATES — it never files an incident. That is what makes a global,
 * always-present control safe here: nothing reaches the ops queue until the
 * driver picks an incident type and taps Send, so a pocket-tap costs a
 * dismissed screen rather than a false alarm someone has to stand down.
 */
export function SosFab() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const styles = useThemedStyles((colors) => ({
    wrap: {
      position: "absolute" as const,
      right: spacing.md,
      alignItems: "center" as const,
    },
    button: {
      width: 60,
      height: 60,
      borderRadius: radius.full,
      backgroundColor: colors.destructive,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      // Elevation on Android, shadow on iOS — matches the app's card treatment.
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
    label: {
      ...typography.eyebrow,
      color: colors.destructive,
      marginTop: spacing.xs,
    },
  }))

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_ALLOWANCE + spacing.md }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report an emergency"
        accessibilityHint="Opens the SOS form. Nothing is sent until you choose what happened."
        onPress={() => router.push("/sos")}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        // Generous hit area — a driver reaching for this is not aiming
        // carefully.
        hitSlop={8}
      >
        <Siren color="#FFFFFF" size={28} />
      </Pressable>
      <Text style={styles.label}>SOS</Text>
    </View>
  )
}
