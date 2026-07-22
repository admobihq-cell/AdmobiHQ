import { ScrollView, Text, View, type RefreshControlProps } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { spacing, typography, useThemedStyles } from "@/lib/theme"

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
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    headerText: {
      flex: 1,
    },
    title: {
      ...typography.largeTitle,
      color: c.text,
    },
    subtitle: {
      ...typography.bodySm,
      color: c.mutedForeground,
      marginTop: spacing.xs,
    },
  }))

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
