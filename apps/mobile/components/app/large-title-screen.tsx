import { ScrollView, StyleSheet, Text, View, type RefreshControlProps } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { colors, spacing, typography } from "@/lib/theme"

type LargeTitleScreenProps = {
  title: string
  subtitle?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
  refreshControl?: React.ReactElement<RefreshControlProps>
}

export function LargeTitleScreen({
  title,
  subtitle,
  headerRight,
  children,
  refreshControl,
}: LargeTitleScreenProps) {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md },
      ]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.largeTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
})
