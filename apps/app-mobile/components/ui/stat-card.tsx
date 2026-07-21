import { StyleSheet, Text, View } from "react-native"

import type { AppIcon } from "@/components/icons"
import { colors, spacing, typography } from "@/lib/theme"

type StatCardProps = {
  label: string
  value: string
  hint?: string
  icon: AppIcon
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon color={colors.primary} size={18} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "46%",
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  label: {
    ...typography.caption,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  hint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
})
