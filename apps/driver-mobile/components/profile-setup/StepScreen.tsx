import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { StepIndicator } from "@/components/profile-setup/StepIndicator"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

export function StepScreen({
  stepIndex,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  nextLoading,
  error,
}: {
  stepIndex: number
  title: string
  description: string
  children: React.ReactNode
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  error?: string | null
}) {
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg, gap: spacing.lg },
    title: { ...typography.title, color: c.text },
    description: { ...typography.body, color: c.mutedText, marginTop: spacing.xs },
    error: { ...typography.bodySm, color: c.danger },
    footer: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    backButton: { paddingVertical: 10, paddingHorizontal: 4 },
    backLabel: { ...typography.body, color: c.mutedText },
    nextButton: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: "center" as const,
      opacity: nextDisabled ? 0.5 : 1,
    },
    nextLabel: { ...typography.body, fontWeight: "700" as const, color: c.primaryForeground },
  }))

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentIndex={stepIndex} />

        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {children}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          {onBack ? (
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            style={styles.nextButton}
            onPress={onNext}
            disabled={nextDisabled || nextLoading}
          >
            {nextLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextLabel}>{nextLabel}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}
