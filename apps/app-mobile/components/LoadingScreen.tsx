import { StyleSheet, View } from "react-native"

import { AppLoader } from "@/components/app/app-loader"
import { colors } from "@/lib/theme"

type LoadingScreenProps = {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <AppLoader message={message ?? "Preparing your workspace"} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
