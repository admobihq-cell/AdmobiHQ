import { Link, Stack } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { spacing, typography, useThemeColors } from "@/lib/theme"

export default function NotFoundScreen() {
  const colors = useThemeColors()

  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
        <Link href="/" style={[styles.link, { color: colors.primary }]}>
          Back to Earnings
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.title },
  link: { ...typography.body, fontWeight: "700" },
})
