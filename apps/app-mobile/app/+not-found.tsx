import { Link, Stack } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/lib/theme"

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to overview</Text>
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
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  link: {
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
})
