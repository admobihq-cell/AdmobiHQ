import { useEffect } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { radius, spacing, useThemedStyles } from "@/lib/theme"

type SkeletonBlockProps = {
  width?: number | `${number}%`
  height?: number
  style?: ViewStyle
  borderRadius?: number
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  style,
  borderRadius = radius.sm,
}: SkeletonBlockProps) {
  const styles = useThemedStyles((c) => ({
    block: {
      backgroundColor: c.muted,
    },
  }))
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true)
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  )
}

/** Avatar + two-line row — matches generic `ListRow`. */
export function SkeletonListRows({ count = 6 }: { count?: number }) {
  return (
    <View style={staticStyles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={staticStyles.row}>
          <SkeletonBlock width={40} height={40} borderRadius={20} />
          <View style={staticStyles.rowContent}>
            <SkeletonBlock width="70%" height={14} />
            <SkeletonBlock width="45%" height={12} style={staticStyles.rowGap} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Three-line content + trailing chip/time — matches triage entity rows. */
export function SkeletonTriageRows({ count = 6 }: { count?: number }) {
  return (
    <View style={staticStyles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={staticStyles.triageRow}>
          <View style={staticStyles.triageContent}>
            <SkeletonBlock width="62%" height={15} />
            <SkeletonBlock
              width="48%"
              height={12}
              style={staticStyles.triageLineGap}
            />
            <SkeletonBlock
              width="72%"
              height={11}
              style={staticStyles.triageMetaGap}
            />
          </View>
          <View style={staticStyles.triageTrailing}>
            <SkeletonBlock width={56} height={22} borderRadius={999} />
            <SkeletonBlock
              width={36}
              height={10}
              style={staticStyles.triageTimeGap}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

function SkeletonFieldRows({ count }: { count: number }) {
  const styles = useThemedStyles((c) => ({
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: spacing.md,
    },
  }))

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>
          <View style={staticStyles.detailField}>
            <SkeletonBlock width={72} height={10} />
            <SkeletonBlock
              width={index % 2 === 0 ? "78%" : "58%"}
              height={15}
              style={staticStyles.detailFieldValue}
            />
          </View>
          {index < count - 1 ? <View style={styles.separator} /> : null}
        </View>
      ))}
    </>
  )
}

/** Hero card + grouped field sections — matches `EntityDetail`. */
export function SkeletonDetailRecord({
  sections = 2,
  fieldsPerSection = 4,
}: {
  sections?: number
  fieldsPerSection?: number
}) {
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    hero: {
      gap: spacing.sm,
      marginBottom: spacing.sm,
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chips: {
      flexDirection: "row" as const,
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    section: {
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      marginBottom: spacing.sm,
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
    <View style={styles.root}>
      <View style={styles.hero}>
        <SkeletonBlock width={56} height={10} />
        <SkeletonBlock width="72%" height={24} style={staticStyles.heroTitle} />
        <View style={styles.chips}>
          <SkeletonBlock width={64} height={24} borderRadius={999} />
          <SkeletonBlock width={72} height={24} borderRadius={999} />
        </View>
      </View>

      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <SkeletonBlock
            width={sectionIndex === 0 ? 88 : 104}
            height={10}
            style={styles.sectionTitle}
          />
          <View style={styles.group}>
            <SkeletonFieldRows
              count={
                sectionIndex === sections - 1
                  ? Math.max(2, fieldsPerSection - 1)
                  : fieldsPerSection
              }
            />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Sectioned inputs — matches `EntityFormScreen` edit loading. */
export function SkeletonFormRecord({
  sections = 2,
  fieldsPerSection = 3,
}: {
  sections?: number
  fieldsPerSection?: number
}) {
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    title: {
      marginBottom: spacing.xs,
    },
    section: {
      gap: spacing.md,
    },
    field: {
      gap: spacing.xs,
    },
  }))

  return (
    <View style={styles.root}>
      <SkeletonBlock width="48%" height={16} style={styles.title} />
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <SkeletonBlock
            width={sectionIndex === 0 ? 96 : 112}
            height={10}
            style={staticStyles.formSectionTitle}
          />
          {Array.from({ length: fieldsPerSection }).map((__, fieldIndex) => (
            <View key={fieldIndex} style={styles.field}>
              <SkeletonBlock width={64 + fieldIndex * 12} height={10} />
              <SkeletonBlock
                width="100%"
                height={
                  fieldIndex === fieldsPerSection - 1 && sectionIndex === 1
                    ? 120
                    : 48
                }
                borderRadius={radius.md}
              />
            </View>
          ))}
        </View>
      ))}
      <SkeletonBlock width="100%" height={48} borderRadius={radius.md} />
    </View>
  )
}

const staticStyles = StyleSheet.create({
  list: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowContent: {
    flex: 1,
  },
  rowGap: {
    marginTop: 8,
  },
  triageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  triageContent: {
    flex: 1,
  },
  triageLineGap: {
    marginTop: 6,
  },
  triageMetaGap: {
    marginTop: 6,
  },
  triageTrailing: {
    alignItems: "flex-end",
  },
  triageTimeGap: {
    marginTop: 8,
  },
  detailField: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  detailFieldValue: {
    marginTop: 8,
  },
  heroTitle: {
    marginTop: 4,
  },
  formSectionTitle: {
    marginLeft: spacing.xs,
  },
})
