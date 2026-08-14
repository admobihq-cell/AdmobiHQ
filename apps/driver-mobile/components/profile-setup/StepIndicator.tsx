import { Text, View } from "react-native"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const STEP_LABELS = ["Profile", "Tax & payout", "Review"]

export function StepIndicator({ currentIndex }: { currentIndex: number }) {
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: "row" as const, alignItems: "center" as const },
    dotWrap: { flex: 1, alignItems: "center" as const },
    dot: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
    },
    dotComplete: { backgroundColor: c.primary, borderColor: c.primary },
    dotCurrent: { borderColor: c.primary },
    dotUpcoming: { borderColor: c.border },
    dotLabelComplete: { color: c.primaryForeground, fontSize: 11, fontWeight: "700" as const },
    dotLabelCurrent: { color: c.primary, fontSize: 11, fontWeight: "700" as const },
    dotLabelUpcoming: { color: c.mutedText, fontSize: 11, fontWeight: "700" as const },
    line: { flex: 1, height: 1, backgroundColor: c.border, marginHorizontal: 2 },
    lineComplete: { backgroundColor: c.primary },
    caption: { ...typography.caption, color: c.mutedText, textAlign: "center" as const, marginTop: spacing.xs },
  }))

  return (
    <View>
      <View style={styles.row}>
        {STEP_LABELS.map((label, index) => (
          <View key={label} style={styles.dotWrap}>
            <View style={styles.row}>
              {index > 0 ? (
                <View style={[styles.line, index <= currentIndex && styles.lineComplete]} />
              ) : null}
              <View
                style={[
                  styles.dot,
                  index < currentIndex
                    ? styles.dotComplete
                    : index === currentIndex
                      ? styles.dotCurrent
                      : styles.dotUpcoming,
                ]}
              >
                <Text
                  style={
                    index < currentIndex
                      ? styles.dotLabelComplete
                      : index === currentIndex
                        ? styles.dotLabelCurrent
                        : styles.dotLabelUpcoming
                  }
                >
                  {index + 1}
                </Text>
              </View>
              {index < STEP_LABELS.length - 1 ? (
                <View style={[styles.line, index < currentIndex && styles.lineComplete]} />
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>{STEP_LABELS[currentIndex]}</Text>
    </View>
  )
}
