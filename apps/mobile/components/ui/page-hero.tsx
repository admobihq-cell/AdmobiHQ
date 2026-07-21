import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/lib/theme"

type PageHeroProps = {
  eyebrow?: string
  title: string
  description?: string
  trailing?: React.ReactNode
  compact?: boolean
}

export function PageHero({
  eyebrow,
  title,
  description,
  trailing,
  compact = false,
}: PageHeroProps) {
  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rootCompact: {
    marginBottom: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  description: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
})
