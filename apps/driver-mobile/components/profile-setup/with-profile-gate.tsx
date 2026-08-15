import type { ComponentType } from "react"
import { ActivityIndicator, View } from "react-native"

import { CompleteProfilePlaceholder } from "@/components/profile-setup/CompleteProfilePlaceholder"
import { useDriverProfile } from "@/lib/driver-profile"
import { useThemedStyles } from "@/lib/theme"

/** Wraps a tab screen so it shows the "complete your profile" placeholder
 * instead of real content until the driver is approved — applied to every
 * tab except Settings, which always renders normally (it's where the
 * status/stepper trigger live). */
export function withProfileGate<P extends object>(Screen: ComponentType<P>) {
  return function GatedScreen(props: P) {
    const { profile, loading, error } = useDriverProfile()
    const styles = useThemedStyles((c) => ({
      center: {
        flex: 1,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: c.background,
      },
    }))

    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )
    }
    if (!error && profile && profile.status !== "approved") {
      return <CompleteProfilePlaceholder status={profile.status} />
    }

    return <Screen {...props} />
  }
}
