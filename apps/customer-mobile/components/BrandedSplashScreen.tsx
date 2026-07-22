import { Image, StyleSheet, View } from "react-native"

/** Matches native splash: black canvas + Admobi typemark. Works in Expo Go. */
export function BrandedSplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/splash-icon.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Admobi"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 280,
    height: 140,
  },
})
