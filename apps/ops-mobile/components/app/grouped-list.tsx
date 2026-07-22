import { StyleSheet, Text, View } from "react-native"

import { spacing, typography, useThemedStyles } from "@/lib/theme"

type GroupedSectionProps = {
  title?: string
  footer?: string
  children: React.ReactNode
}

export function GroupedSection({ title, footer, children }: GroupedSectionProps) {
  const styles = useThemedStyles((c) => ({
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    sectionFooter: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: spacing.sm,
      marginLeft: spacing.xs,
    },
    group: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden" as const,
    },
  }))

  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
      {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
    </View>
  )
}

type GroupedListProps = {
  children: React.ReactNode
}

export function GroupedList({ children }: GroupedListProps) {
  const styles = useThemedStyles((c) => ({
    list: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden" as const,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 68,
    },
  }))
  const items = Array.isArray(children) ? children : [children]
  const visible = items.filter(Boolean)

  return (
    <View style={styles.list}>
      {visible.map((child, index) => (
        <View key={index}>
          {child}
          {index < visible.length - 1 ? <View style={styles.separator} /> : null}
        </View>
      ))}
    </View>
  )
}
