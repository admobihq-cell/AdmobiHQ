import { Text, View } from "react-native"

import type { AppIcon } from "@/components/icons"
import { IconBox } from "@/components/ui"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type PageHeroProps = {
  /** @deprecated Kicker labels above a heading are a banned pattern here — the heading carries its own weight. Ignored whenever `icon` is provided; only kept for the handful of screens not yet migrated to `icon`. */
  eyebrow?: string
  title: string
  description?: string
  trailing?: React.ReactNode
  compact?: boolean
  /** Renders a tinted icon tile beside the title instead of an eyebrow label — the section identity lives in the icon, not in repeated caption text. */
  icon?: AppIcon
}

export function PageHero({
  eyebrow,
  title,
  description,
  trailing,
  compact = false,
  icon: Icon,
}: PageHeroProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    root: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    rootCompact: {
      marginBottom: spacing.sm,
    },
    iconAndCopy: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: {
      fontSize: Icon ? 21 : 26,
      fontWeight: "700" as const,
      color: c.text,
      letterSpacing: -0.3,
    },
    description: {
      ...typography.bodySm,
      color: c.mutedForeground,
      marginTop: 2,
    },
  }))

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={styles.iconAndCopy}>
        {Icon ? (
          <IconBox
            icon={Icon}
            size={20}
            boxSize={44}
            cornerRadius={radius.lg}
            backgroundColor={`${colors.primary}14`}
            bordered={false}
            iconColor={colors.primary}
          />
        ) : null}
        <View style={styles.copy}>
          {eyebrow && !Icon ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {description ? (
            <Text
              style={styles.description}
              numberOfLines={compact ? 1 : 2}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {trailing}
    </View>
  )
}
