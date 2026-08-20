import { View } from "react-native"

import { AppLoader } from "@/components/AppLoader"
import { useThemedStyles } from "@/lib/theme"

/**
 * Themed hold screen for the moment between "session state just changed" and
 * "the router has actually navigated". Deliberately NOT BrandedSplashScreen —
 * that one is pure black to match the native cold-boot splash, and cutting to
 * it mid-session (e.g. right after Google sign-in) read as the app crashing
 * back to launch. This stays on the app's live background/logo instead.
 */
export function AuthHandoff({ message = "One moment" }: { message?: string }) {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
    },
  }))

  return (
    <View style={styles.container}>
      <AppLoader message={message} />
    </View>
  )
}
