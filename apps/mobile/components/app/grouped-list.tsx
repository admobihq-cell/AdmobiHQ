import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "@/lib/theme"

type GroupedSectionProps = {
  title?: string
  footer?: string
  children: React.ReactNode
}

export function GroupedSection({ title, footer, children }: GroupedSectionProps) {
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

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionFooter: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
})
