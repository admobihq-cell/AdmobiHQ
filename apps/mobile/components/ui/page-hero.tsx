import { Text, View } from "react-native"

import { spacing, typography, useThemedStyles } from "@/lib/theme"

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
  const styles = useThemedStyles((c) => ({
    root: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
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
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: c.text,
      letterSpacing: -0.4,
    },
    description: {
      ...typography.body,
      color: c.mutedForeground,
      marginTop: spacing.xs,
    },
  }))

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
