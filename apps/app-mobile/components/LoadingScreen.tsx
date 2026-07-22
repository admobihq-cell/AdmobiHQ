import { View } from "react-native"

import { AppLoader } from "@/components/app/app-loader"
import { useThemedStyles } from "@/lib/theme"

type LoadingScreenProps = {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
  }))

  return (
    <View style={styles.container}>
      <AppLoader message={message ?? "Preparing your workspace"} />
    </View>
  )
}
