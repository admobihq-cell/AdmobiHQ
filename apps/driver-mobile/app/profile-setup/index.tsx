import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"

import { nextProfileSetupStep, useDriverProfile } from "@/lib/driver-profile"
import { useThemedStyles } from "@/lib/theme"

export default function ProfileSetupIndex() {
  const { profile, loading, error } = useDriverProfile()
  const styles = useThemedStyles((c) => ({
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: c.background },
  }))

  if (loading || error || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  // "approved" and "submitted" have nothing left to do in this stack —
  // Settings shows status inline (see DriverVerificationSection).
  if (profile.status === "approved" || profile.status === "submitted") {
    return <Redirect href="/(tabs)/settings" />
  }

  return <Redirect href={nextProfileSetupStep(profile) as never} />
}
