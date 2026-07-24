import { useRouter } from "expo-router"
import { Pressable, Text } from "react-native"

import { ChevronLeft } from "@/components/icons"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type BackLinkProps = {
  label?: string
}

export function BackLink({ label = "Back" }: BackLinkProps) {
  const router = useRouter()
  const colors = useThemeColors()

  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      alignSelf: "flex-start" as const,
      gap: 2,
      paddingVertical: spacing.xs,
    },
    rowPressed: {
      opacity: 0.6,
    },
    text: {
      ...typography.section,
      color: c.primary,
      fontWeight: "600" as const,
    },
  }))

  function handlePress() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.push("/settings")
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <ChevronLeft color={colors.primary} size={20} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  )
}
