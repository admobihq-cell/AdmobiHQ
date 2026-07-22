import { View } from "react-native"

import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { AppLoader } from "@/components/app/app-loader"
import { useThemedStyles } from "@/lib/theme"

type LoadingScreenProps = {
  message?: string
  /** Pure Admobi splash (default). Set false to show loading UI with message. */
  splash?: boolean
}

export function LoadingScreen({ message, splash = true }: LoadingScreenProps) {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
    },
  }))

  if (splash) {
    return <BrandedSplashScreen />
  }

  return (
    <View style={styles.container}>
      <AppLoader message={message ?? "Preparing your workspace"} />
    </View>
  )
}
