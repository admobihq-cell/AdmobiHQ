import { StyleSheet, View } from "react-native"

import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { AppLoader } from "@/components/app/app-loader"
import { colors } from "@/lib/theme"

type LoadingScreenProps = {
  message?: string
  /** Pure Admobi splash (default). Set false to show loading UI with message. */
  splash?: boolean
}

export function LoadingScreen({ message, splash = true }: LoadingScreenProps) {
  if (splash) {
    return <BrandedSplashScreen />
  }

  return (
    <View style={styles.container}>
      <AppLoader message={message ?? "Preparing your workspace"} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
})
